import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from './prisma.service';
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
    const data: Prisma.AuditLogUncheckedCreateInput = {
      actorUserId: context.actorUserId ?? null,
      action: context.action,
      entityType: context.entityType,
      entityId: context.entityId ?? null,
      requestId: context.requestId,
      ipAddress: context.ipAddress.slice(0, 80),
      userAgent: context.userAgent.slice(0, 300),
      metadataJson: redactAuditMetadata(context.metadata ?? {}) as Prisma.InputJsonValue,
    };
    await this.prisma.auditLog.create({
      data,
    });
  }
}
