import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  connectTimeout: 1500,
});

describe('database and Redis integration', () => {
  let databaseReady = false;
  let redisReady = false;

  beforeAll(async () => {
    if (process.env.NODE_ENV === 'production') throw new Error('Integration tests cannot run against production.');
    await prisma.$connect();
    databaseReady = true;
    await redis.connect();
    await redis.ping();
    redisReady = true;
  }, 10_000);

  afterAll(async () => {
    if (redisReady) await redis.quit();
    else redis.disconnect();
    if (databaseReady) await prisma.$disconnect();
  });

  it('persists the request fan-out and enforces tenant and selection boundaries', async () => {
    const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
    const insurance = await prisma.insuranceProvider.create({ data: { name: `Integration ${suffix}`, type: 'BASE' } });
    const pharmacyA = await prisma.pharmacy.create({
      data: {
        name: `Integration A ${suffix}`,
        technicalManager: 'مسئول فنی آزمون',
        licenseNumber: `LIC-A-${suffix}`,
        licenseExpirationDate: new Date(Date.now() + 86_400_000),
        mobile: `0912${suffix.slice(0, 7)}`,
        phone: '02100000000',
        province: 'تهران',
        city: 'تهران',
        address: 'نشانی تست یک',
        postalCode: '1234567890',
        workingHours: '۸ تا ۲۰',
        registrationStatus: 'APPROVED',
      },
    });
    const pharmacyB = await prisma.pharmacy.create({
      data: {
        name: `Integration B ${suffix}`,
        technicalManager: 'مسئول فنی آزمون',
        licenseNumber: `LIC-B-${suffix}`,
        licenseExpirationDate: new Date(Date.now() + 86_400_000),
        mobile: `0913${suffix.slice(0, 7)}`,
        phone: '02100000001',
        province: 'تهران',
        city: 'تهران',
        address: 'نشانی تست دو',
        postalCode: '1234567891',
        workingHours: '۸ تا ۲۰',
        registrationStatus: 'APPROVED',
      },
    });
    const prescription = await prisma.prescription.create({
      data: {
        publicId: `RX-INT${suffix.slice(0, 8).toUpperCase()}`,
        accessTokenHash: `hash-${suffix}`,
        mobile: '09123456789',
        nationalId: '0012446663',
        prescriptionTrackingCode: `TRACK-${suffix}`,
        baseInsuranceId: insurance.id,
        expiresAt: new Date(Date.now() + 86_400_000),
        assignments: { create: [{ pharmacyId: pharmacyA.id }, { pharmacyId: pharmacyB.id }] },
      },
    });

    try {
      const assignments = await prisma.prescriptionPharmacyRequest.findMany({ where: { prescriptionId: prescription.id }, orderBy: { pharmacyId: 'asc' } });
      expect(assignments).toHaveLength(2);
      expect(await prisma.prescriptionPharmacyRequest.count({ where: { id: assignments[0]?.id, pharmacyId: pharmacyB.id } })).toBe(0);

      await prisma.pharmacyResponse.create({ data: { prescriptionId: prescription.id, pharmacyId: pharmacyA.id, userId: randomUUID(), availabilityStatus: 'FULL_AVAILABLE' } }).catch(async (error: unknown) => {
        if (!(error instanceof Error) || !error.message.includes('Foreign key constraint')) throw error;
        const user = await prisma.user.create({ data: { firstName: 'تست', lastName: 'داروخانه', username: `integration-${suffix}`, mobile: `099${suffix.slice(0, 8)}`, passwordHash: 'integration-only', role: 'PHARMACY_ADMIN', pharmacyId: pharmacyA.id } });
        await prisma.pharmacyResponse.create({ data: { prescriptionId: prescription.id, pharmacyId: pharmacyA.id, userId: user.id, availabilityStatus: 'FULL_AVAILABLE' } });
      });
      const userB = await prisma.user.create({ data: { firstName: 'تست', lastName: 'داروخانه', username: `integration-b-${suffix}`, mobile: `098${suffix.slice(0, 8)}`, passwordHash: 'integration-only', role: 'PHARMACY_ADMIN', pharmacyId: pharmacyB.id } });
      await prisma.pharmacyResponse.create({ data: { prescriptionId: prescription.id, pharmacyId: pharmacyB.id, userId: userB.id, availabilityStatus: 'PARTIAL_AVAILABLE', description: 'بخشی از اقلام موجود است.' } });

      const firstSelection = await prisma.$transaction(async (transaction) => {
        const update = await transaction.prescription.updateMany({ where: { id: prescription.id, selectedPharmacyId: null, cancelledAt: null, completedAt: null, expiresAt: { gt: new Date() } }, data: { selectedPharmacyId: pharmacyA.id, status: 'SELECTED_PHARMACY' } });
        if (update.count !== 1) throw new Error('selection failed');
        await transaction.prescriptionPharmacyRequest.update({ where: { prescriptionId_pharmacyId: { prescriptionId: prescription.id, pharmacyId: pharmacyA.id } }, data: { status: 'SELECTED' } });
        await transaction.prescriptionPharmacyRequest.updateMany({ where: { prescriptionId: prescription.id, pharmacyId: { not: pharmacyA.id } }, data: { status: 'CLOSED' } });
        return update.count;
      });
      expect(firstSelection).toBe(1);
      const secondSelection = await prisma.prescription.updateMany({ where: { id: prescription.id, selectedPharmacyId: null }, data: { selectedPharmacyId: pharmacyB.id, status: 'SELECTED_PHARMACY' } });
      expect(secondSelection.count).toBe(0);
      const finalAssignments = await prisma.prescriptionPharmacyRequest.findMany({ where: { prescriptionId: prescription.id }, select: { pharmacyId: true, status: true } });
      expect(finalAssignments.find((item) => item.pharmacyId === pharmacyA.id)?.status).toBe('SELECTED');
      expect(finalAssignments.find((item) => item.pharmacyId === pharmacyB.id)?.status).toBe('CLOSED');
      expect(await redis.ping()).toBe('PONG');
    } finally {
      const users = await prisma.user.findMany({ where: { username: { startsWith: `integration` }, pharmacyId: { in: [pharmacyA.id, pharmacyB.id] } }, select: { id: true } });
      await prisma.$transaction([
        prisma.pharmacyResponse.deleteMany({ where: { prescriptionId: prescription.id } }),
        prisma.prescriptionPharmacyRequest.deleteMany({ where: { prescriptionId: prescription.id } }),
        prisma.prescription.delete({ where: { id: prescription.id } }),
        prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } }),
        prisma.pharmacy.deleteMany({ where: { id: { in: [pharmacyA.id, pharmacyB.id] } } }),
        prisma.insuranceProvider.delete({ where: { id: insurance.id } }),
      ]);
    }
  });
});
