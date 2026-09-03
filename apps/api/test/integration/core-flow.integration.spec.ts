import { ConfigService } from '@nestjs/config';
import type { AppEnvironment } from '@pharmacy-mvp/config';
import { parseEnvironment } from '@pharmacy-mvp/config';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../../src/common/audit.service';
import { PrismaService } from '../../src/common/prisma.service';
import { RedisService } from '../../src/common/redis.service';
import type { RequestWithContext } from '../../src/common/request-context';
import { InsuranceService } from '../../src/insurance/insurance.service';
import { PrescriptionService } from '../../src/prescriptions/prescription.service';

process.env.DATABASE_URL ??= 'postgresql://user:password@localhost:5432/pharmacy_mvp';
process.env.REDIS_URL ??= 'redis://localhost:6379';

const createTestConfig = (): ConfigService<AppEnvironment, true> => {
  const environment = parseEnvironment({
    ...process.env,
    NODE_ENV: 'test',
    APP_ENV: 'test',
    DATABASE_URL:
      process.env.DATABASE_URL ?? 'postgresql://user:password@localhost:5432/pharmacy_mvp',
    REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'a'.repeat(32),
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'b'.repeat(32),
    S3_ENDPOINT: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    S3_BUCKET: process.env.S3_BUCKET ?? 'pharmacy-documents',
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ?? 'integration-access-key',
    S3_SECRET_KEY: process.env.S3_SECRET_KEY ?? 'integration-secret-key',
    S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE ?? 'true',
    SWAGGER_ENABLED: 'false',
    LOG_LEVEL: 'error',
  });
  return new ConfigService<AppEnvironment, true>(environment);
};

const requestContext = (requestId: string, ip: string): RequestWithContext =>
  ({
    requestId,
    ip,
    header: () => undefined,
    get: (name: string) => (name.toLowerCase() === 'user-agent' ? 'integration-test' : undefined),
  }) as unknown as RequestWithContext;

describe('prescription core flow integration', () => {
  const prisma = new PrismaService();
  const config = createTestConfig();
  const redis = new RedisService(config);
  const insurance = new InsuranceService(prisma, redis);
  const audit = new AuditService(prisma);
  const prescriptions = new PrescriptionService(prisma, config, insurance, redis, audit);
  let databaseReady = false;
  let redisReady = false;

  beforeAll(async () => {
    if (process.env.NODE_ENV === 'production')
      throw new Error('Integration tests cannot run against production.');
    await prisma.$connect();
    databaseReady = true;
    await redis.onModuleInit();
    await redis.client.ping();
    redisReady = true;
  }, 10_000);

  afterAll(async () => {
    if (redisReady) await redis.onModuleDestroy();
    else redis.client.disconnect();
    if (databaseReady) await prisma.$disconnect();
  });

  it('runs patient creation, pharmacy tenant isolation, responses, selection, and closure', async () => {
    const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
    const requestId = `integration-${suffix}`;
    const ip = `integration-ip-${suffix}`;
    let insuranceId: string | undefined;
    let pharmacyAId: string | undefined;
    let pharmacyBId: string | undefined;
    let userAId: string | undefined;
    let userBId: string | undefined;
    let prescriptionId: string | undefined;

    try {
      const createdInsurance = await prisma.insuranceProvider.create({
        data: { name: `Integration ${suffix}`, type: 'BASE' },
      });
      insuranceId = createdInsurance.id;
      const [pharmacyA, pharmacyB] = await Promise.all([
        prisma.pharmacy.create({
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
        }),
        prisma.pharmacy.create({
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
        }),
      ]);
      pharmacyAId = pharmacyA.id;
      pharmacyBId = pharmacyB.id;
      const [userA, userB] = await Promise.all([
        prisma.user.create({
          data: {
            firstName: 'تست',
            lastName: 'داروخانه',
            username: `integration-a-${suffix}`,
            mobile: `099${suffix.slice(0, 8)}`,
            passwordHash: 'integration-only',
            role: 'PHARMACY_ADMIN',
            pharmacyId: pharmacyA.id,
          },
        }),
        prisma.user.create({
          data: {
            firstName: 'تست',
            lastName: 'داروخانه',
            username: `integration-b-${suffix}`,
            mobile: `098${suffix.slice(0, 8)}`,
            passwordHash: 'integration-only',
            role: 'PHARMACY_ADMIN',
            pharmacyId: pharmacyB.id,
          },
        }),
      ]);
      userAId = userA.id;
      userBId = userB.id;

      const result = await prescriptions.create(
        {
          mobile: '۰۹۱۲-۳۴۵۶۷۸۹',
          nationalId: '۰۰۱۲۴۴۶۶۶۱',
          prescriptionTrackingCode: `TRACK-${suffix}`,
          baseInsuranceId: createdInsurance.id,
          hasSupplementaryInsurance: false,
          supplementaryInsuranceId: undefined,
          supplementaryDescription: undefined,
          patientDescription: 'درخواست تست یکپارچه',
        },
        requestContext(requestId, ip),
      );
      const prescription = await prisma.prescription.findUniqueOrThrow({
        where: { publicId: result.publicId },
      });
      prescriptionId = prescription.id;
      expect(result.accessToken).toHaveLength(43);

      const assignments = await prisma.prescriptionPharmacyRequest.findMany({
        where: { prescriptionId: prescription.id },
      });
      expect(assignments).toHaveLength(2);
      expect(assignments.map((assignment) => assignment.pharmacyId).sort()).toEqual(
        [pharmacyA.id, pharmacyB.id].sort(),
      );

      const pharmacyAList = await prescriptions.listForPharmacy(pharmacyA.id, {});
      const pharmacyBList = await prescriptions.listForPharmacy(pharmacyB.id, {});
      expect(pharmacyAList.items).toHaveLength(1);
      expect(pharmacyBList.items).toHaveLength(1);
      const assignmentA = assignments.find((assignment) => assignment.pharmacyId === pharmacyA.id);
      const assignmentB = assignments.find((assignment) => assignment.pharmacyId === pharmacyB.id);
      expect(assignmentA).toBeDefined();
      expect(assignmentB).toBeDefined();

      await expect(
        prescriptions.getForPharmacy(assignmentA!.id, pharmacyB.id, requestContext(requestId, ip)),
      ).rejects.toMatchObject({ status: 404 });
      await prescriptions.getForPharmacy(
        assignmentA!.id,
        pharmacyA.id,
        requestContext(`${requestId}-view-a`, ip),
      );
      await prescriptions.respond(
        assignmentA!.id,
        pharmacyA.id,
        userA.id,
        { availabilityStatus: 'FULL_AVAILABLE' },
        requestContext(`${requestId}-respond-a`, ip),
      );
      await prescriptions.respond(
        assignmentB!.id,
        pharmacyB.id,
        userB.id,
        {
          availabilityStatus: 'PARTIAL_AVAILABLE',
          description: 'بخشی از اقلام موجود است.',
        },
        requestContext(`${requestId}-respond-b`, ip),
      );

      const publicView = await prescriptions.getPublic(
        result.publicId,
        result.accessToken,
        requestContext(`${requestId}-public`, ip),
      );
      const responses = publicView.responses as Array<{
        pharmacyId: string;
        availabilityStatus: string;
      }>;
      expect(responses.map((response) => response.availabilityStatus)).toEqual([
        'FULL_AVAILABLE',
        'PARTIAL_AVAILABLE',
      ]);
      expect(publicView.status).toBe('ACCEPTED');

      await expect(
        prescriptions.getPublic(
          result.publicId,
          'wrong-token',
          requestContext(`${requestId}-bad`, ip),
        ),
      ).rejects.toMatchObject({ status: 404 });
      await prescriptions.selectPharmacy(
        result.publicId,
        result.accessToken,
        pharmacyA.id,
        requestContext(`${requestId}-select`, ip),
      );
      await expect(
        prescriptions.selectPharmacy(
          result.publicId,
          result.accessToken,
          pharmacyB.id,
          requestContext(`${requestId}-select-again`, ip),
        ),
      ).rejects.toMatchObject({ status: 409 });

      const finalPrescription = await prisma.prescription.findUniqueOrThrow({
        where: { id: prescription.id },
        include: { assignments: true },
      });
      expect(finalPrescription.status).toBe('SELECTED_PHARMACY');
      expect(finalPrescription.selectedPharmacyId).toBe(pharmacyA.id);
      expect(
        finalPrescription.assignments.find((item) => item.pharmacyId === pharmacyA.id)?.status,
      ).toBe('SELECTED');
      expect(
        finalPrescription.assignments.find((item) => item.pharmacyId === pharmacyB.id)?.status,
      ).toBe('CLOSED');

      await expect(
        prescriptions.respond(
          assignmentB!.id,
          pharmacyB.id,
          userB.id,
          { availabilityStatus: 'NOT_AVAILABLE' },
          requestContext(`${requestId}-respond-after-select`, ip),
        ),
      ).rejects.toMatchObject({ status: 409 });
    } finally {
      if (prescriptionId) {
        await prisma.auditLog.deleteMany({ where: { entityId: prescriptionId } });
        await prisma.notification.deleteMany({ where: { entityId: prescriptionId } });
        await prisma.pharmacyResponse.deleteMany({ where: { prescriptionId } });
        await prisma.prescriptionPharmacyRequest.deleteMany({ where: { prescriptionId } });
        await prisma.prescription.delete({ where: { id: prescriptionId } });
      }
      if (userAId || userBId)
        await prisma.user.deleteMany({
          where: { id: { in: [userAId, userBId].filter((id): id is string => Boolean(id)) } },
        });
      if (pharmacyAId || pharmacyBId)
        await prisma.pharmacy.deleteMany({
          where: {
            id: { in: [pharmacyAId, pharmacyBId].filter((id): id is string => Boolean(id)) },
          },
        });
      if (insuranceId) await prisma.insuranceProvider.delete({ where: { id: insuranceId } });
    }
  }, 20_000);
});
