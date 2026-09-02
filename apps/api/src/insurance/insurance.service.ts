import { Injectable } from '@nestjs/common';
import type { InsuranceType } from '@prisma/client';
import type { PrismaService } from '../common/prisma.service';
import type { RedisService } from '../common/redis.service';

@Injectable()
export class InsuranceService {
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  async list(type: InsuranceType): Promise<Array<{ id: string; name: string }>> {
    const key = `pharmacy-mvp:insurance:${type.toLowerCase()}`;
    const cached = await this.redis.getJson<Array<{ id: string; name: string }>>(key);
    if (cached) return cached;
    const providers = await this.prisma.insuranceProvider.findMany({
      where: { type, isActive: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    await this.redis.setJson(key, providers, 300);
    return providers;
  }

  async assertActive(id: string, type: InsuranceType): Promise<void> {
    const provider = await this.prisma.insuranceProvider.findFirst({ where: { id, type, isActive: true }, select: { id: true } });
    if (!provider) throw new Error('Insurance provider is not active');
  }
}
