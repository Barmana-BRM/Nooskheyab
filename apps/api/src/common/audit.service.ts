import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { redactAuditMetadata } from './masking';

export interface AuditContext {
  actorUserId?: string | undefined;
  action: string;
  entityType: string;
  entityId?: string | undefined;
  requestId: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(context: AuditContext): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: context.actorUserId,
        action: context.action,
        entityType: context.entityType,
        entityId: context.entityId,
        requestId: context.requestId,
        ipAddress: context.ipAddress.slice(0, 80),
        userAgent: context.userAgent.slice(0, 300),
        metadataJson: redactAuditMetadata(context.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
