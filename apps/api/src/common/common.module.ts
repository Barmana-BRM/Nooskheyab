import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { StorageService } from './storage.service';
import { StructuredLogger } from './structured-logger';

@Global()
@Module({
  providers: [PrismaService, RedisService, StorageService, AuditService, StructuredLogger],
  exports: [PrismaService, RedisService, StorageService, AuditService, StructuredLogger],
})
export class CommonModule {}
