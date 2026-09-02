import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import type { PrismaService } from './common/prisma.service';
import type { RedisService } from './common/redis.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  @Get()
  async health(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      if (this.redis.client.status === 'ready') await this.redis.client.ping();
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('سامانه موقتاً در دسترس نیست.');
    }
  }
}
