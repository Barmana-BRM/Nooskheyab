import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { redactAuditMetadata } from './masking';

export interface AuditContext {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
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
        metadataJson: redactAuditMetadata(context.metadata ?? {}),
      },
    });
  }
}
