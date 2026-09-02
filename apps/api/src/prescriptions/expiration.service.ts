import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';

@Injectable()
export class ExpirationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireDuePrescriptions(): Promise<void> {
    const lockKey = 'pharmacy-mvp:lock:prescription-expiration';
    if (this.redis.client.status === 'ready') {
      const locked = await this.redis.setIfNotExists(lockKey, new Date().toISOString(), 55);
      if (!locked) return;
    }
    const now = new Date();
    const due = await this.prisma.prescription.findMany({
      where: {
        expiresAt: { lte: now },
        cancelledAt: null,
        completedAt: null,
        selectedPharmacyId: null,
        status: { not: 'EXPIRED' },
      },
      select: { id: true },
      take: 100,
    });
    if (!due.length) return;
    const ids = due.map((item) => item.id);
    await this.prisma.$transaction([
      this.prisma.prescription.updateMany({
        where: { id: { in: ids }, selectedPharmacyId: null, cancelledAt: null, completedAt: null },
        data: { status: 'EXPIRED' },
      }),
      this.prisma.prescriptionPharmacyRequest.updateMany({
        where: { prescriptionId: { in: ids }, status: { in: ['SENT', 'VIEWED'] } },
        data: { status: 'EXPIRED', closedAt: now },
      }),
    ]);
  }
}
