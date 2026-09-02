import { Injectable } from '@nestjs/common';
import type { Prisma} from '@prisma/client';
import { type UserRole } from '@prisma/client';
import type { ConfigService } from '@nestjs/config';
import argon2 from 'argon2';
import type { AppEnvironment } from '@pharmacy-mvp/config';
import { normalizeMobile } from '@pharmacy-mvp/validation';
import type { AuditService } from '../common/audit.service';
import { AppError, conflict } from '../common/errors';
import type { PrismaService } from '../common/prisma.service';
import type { RequestWithContext } from '../common/request-context';
import type { PharmacyService } from '../pharmacy/pharmacy.service';
import type { PrescriptionService } from '../prescriptions/prescription.service';
import type { CreateAdminUserDto, CreateInsuranceDto, UpdateInsuranceDto, UpdateUserDto } from './admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pharmacy: PharmacyService,
    private readonly prescriptions: PrescriptionService,
    private readonly config: ConfigService<AppEnvironment, true>,
    private readonly audit: AuditService,
  ) {}

  async dashboard(): Promise<Record<string, unknown>> {
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const week = new Date(today); week.setDate(today.getDate() - 6);
    const month = new Date(today); month.setDate(today.getDate() - 29);
    const [todayCount, weekCount, monthCount, accepted, partial, rejected, activePharmacies, pendingRegistrations, responseRows, dailyRows] = await Promise.all([
      this.prisma.prescription.count({ where: { createdAt: { gte: today } } }),
      this.prisma.prescription.count({ where: { createdAt: { gte: week } } }),
      this.prisma.prescription.count({ where: { createdAt: { gte: month } } }),
      this.prisma.prescription.count({ where: { status: 'ACCEPTED' } }),
      this.prisma.prescription.count({ where: { status: 'PARTIAL' } }),
      this.prisma.prescription.count({ where: { status: 'REJECTED' } }),
      this.prisma.pharmacy.count({ where: { registrationStatus: 'APPROVED', isActive: true, deletedAt: null } }),
      this.prisma.pharmacy.count({ where: { registrationStatus: 'PENDING_APPROVAL', deletedAt: null } }),
      this.prisma.prescriptionPharmacyRequest.findMany({ where: { respondedAt: { not: null }, sentAt: { gte: month } }, select: { sentAt: true, respondedAt: true }, take: 10_000 }),
      this.prisma.prescription.findMany({ where: { createdAt: { gte: month } }, select: { createdAt: true }, take: 10_000 }),
    ]);
    const averageResponseMinutes = responseRows.length ? Math.round(responseRows.reduce((sum, row) => sum + ((row.respondedAt?.getTime() ?? row.sentAt.getTime()) - row.sentAt.getTime()) / 60_000, 0) / responseRows.length) : 0;
    const dailyMap = new Map<string, number>();
    for (const row of dailyRows) {
      const key = row.createdAt.toISOString().slice(0, 10);
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }
    return { requestsToday: todayCount, requestsWeek: weekCount, requestsMonth: monthCount, accepted, partial, rejected, activePharmacies, pendingRegistrations, averageResponseMinutes, dailyTrend: [...dailyMap.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, count]) => ({ date, count })) };
  }

  prescriptionsList(query: Parameters<PrescriptionService['adminList']>[0]) {
    return this.prescriptions.adminList(query);
  }

  prescriptionsDetail(id: string) {
    return this.prescriptions.adminDetail(id);
  }

  registrations(status?: string) {
    return this.pharmacy.adminRegistrations(status);
  }

  registrationDetail(id: string) {
    return this.pharmacy.status(id);
  }

  reviewRegistration(id: string, adminId: string, action: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED', message: string | undefined, request: RequestWithContext) {
    return this.pharmacy.adminReview(id, adminId, action, message ? { message } : undefined, request);
  }

  suspendPharmacy(id: string, adminId: string, request: RequestWithContext) {
    return this.pharmacy.adminSuspend(id, adminId, 'SUSPENDED', request);
  }

  reactivatePharmacy(id: string, adminId: string, request: RequestWithContext) {
    return this.pharmacy.adminSuspend(id, adminId, 'REACTIVATED', request);
  }

  async pharmacies(): Promise<Array<Record<string, unknown>>> {
    const rows = await this.prisma.pharmacy.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, name: true, mobile: true, province: true, city: true, registrationStatus: true, isActive: true, licenseExpirationDate: true, createdAt: true, _count: { select: { users: true, assignments: true } } } });
    return rows.map((row) => ({ ...row, licenseExpirationDate: row.licenseExpirationDate.toISOString(), createdAt: row.createdAt.toISOString() }));
  }

  async softDeletePharmacy(id: string, adminId: string, request: RequestWithContext): Promise<{ deleted: true }> {
    const pharmacy = await this.prisma.pharmacy.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!pharmacy) throw new AppError('NOT_FOUND', 'داروخانه پیدا نشد.', 404);
    await this.prisma.pharmacy.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, registrationStatus: 'SUSPENDED' } });
    await this.audit.record({ actorUserId: adminId, action: 'SUSPEND_PHARMACY', entityType: 'Pharmacy', entityId: id, requestId: request.requestId, ipAddress: request.ip ?? 'unknown', userAgent: request.get('user-agent') ?? '', metadata: { pharmacyId: id, softDeleted: true } });
    return { deleted: true };
  }

  async users(): Promise<Array<Record<string, unknown>>> {
    const rows = await this.prisma.user.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, firstName: true, lastName: true, username: true, mobile: true, role: true, pharmacyId: true, isActive: true, lastLoginAt: true, createdAt: true, pharmacy: { select: { name: true } } } });
    return rows.map((row) => ({ ...row, lastLoginAt: row.lastLoginAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() }));
  }

  async createUser(actor: { id: string; role: UserRole }, body: CreateAdminUserDto, request: RequestWithContext): Promise<{ id: string }> {
    if (body.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN') throw new AppError('FORBIDDEN', 'ساخت SUPER_ADMIN مجاز نیست.', 403);
    if (['PHARMACY_ADMIN', 'PHARMACY_USER'].includes(body.role) && !body.pharmacyId) throw new AppError('VALIDATION_ERROR', 'داروخانه کاربر را مشخص کنید.', 422);
    const passwordHash = await argon2.hash(body.password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({ data: { firstName: body.firstName.trim(), lastName: body.lastName.trim(), username: body.username.trim().toLowerCase(), mobile: normalizeMobile(body.mobile), passwordHash, role: body.role, pharmacyId: body.pharmacyId ?? null } });
    await this.audit.record({ actorUserId: actor.id, action: 'CREATE_USER', entityType: 'User', entityId: user.id, requestId: request.requestId, ipAddress: request.ip ?? 'unknown', userAgent: request.get('user-agent') ?? '', metadata: { role: body.role } });
    return { id: user.id };
  }

  async updateUser(actor: { id: string; role: UserRole }, id: string, body: UpdateUserDto, request: RequestWithContext): Promise<{ updated: true }> {
    if (body.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN') throw new AppError('FORBIDDEN', 'تغییر نقش به SUPER_ADMIN مجاز نیست.', 403);
    await this.prisma.user.update({ where: { id }, data: { ...(body.firstName !== undefined ? { firstName: body.firstName.trim() } : {}), ...(body.lastName !== undefined ? { lastName: body.lastName.trim() } : {}), ...(body.mobile !== undefined ? { mobile: normalizeMobile(body.mobile) } : {}), ...(body.isActive !== undefined ? { isActive: body.isActive } : {}), ...(body.role !== undefined ? { role: body.role } : {}) } });
    await this.audit.record({ actorUserId: actor.id, action: 'UPDATE_USER', entityType: 'User', entityId: id, requestId: request.requestId, ipAddress: request.ip ?? 'unknown', userAgent: request.get('user-agent') ?? '', metadata: { fields: Object.keys(body) } });
    return { updated: true };
  }

  async disableUser(actorId: string, id: string, request: RequestWithContext): Promise<{ disabled: true }> {
    await this.prisma.$transaction([this.prisma.user.update({ where: { id }, data: { isActive: false, deletedAt: new Date() } }), this.prisma.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })]);
    await this.audit.record({ actorUserId: actorId, action: 'DISABLE_USER', entityType: 'User', entityId: id, requestId: request.requestId, ipAddress: request.ip ?? 'unknown', userAgent: request.get('user-agent') ?? '', metadata: {} });
    return { disabled: true };
  }

  async resetPassword(actorId: string, id: string, password: string, request: RequestWithContext): Promise<{ reset: true }> {
    if (password.length < 10) throw new AppError('VALIDATION_ERROR', 'رمز عبور حداقل ۱۰ کاراکتر باشد.', 422);
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await this.prisma.$transaction([this.prisma.user.update({ where: { id }, data: { passwordHash, failedLoginCount: 0, lockedUntil: null } }), this.prisma.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })]);
    await this.audit.record({ actorUserId: actorId, action: 'UPDATE_USER', entityType: 'User', entityId: id, requestId: request.requestId, ipAddress: request.ip ?? 'unknown', userAgent: request.get('user-agent') ?? '', metadata: { passwordReset: true } });
    return { reset: true };
  }

  async insurance(): Promise<Array<Record<string, unknown>>> {
    const rows = await this.prisma.insuranceProvider.findMany({ orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }] });
    return rows.map((row) => ({ id: row.id, name: row.name, type: row.type, isActive: row.isActive, sortOrder: row.sortOrder }));
  }

  async createInsurance(actorId: string, body: CreateInsuranceDto, request: RequestWithContext): Promise<Record<string, unknown>> {
    const row = await this.prisma.insuranceProvider.create({ data: { name: body.name.trim(), type: body.type, isActive: body.isActive ?? true } });
    await this.audit.record({ actorUserId: actorId, action: 'UPDATE_INSURANCE', entityType: 'InsuranceProvider', entityId: row.id, requestId: request.requestId, ipAddress: request.ip ?? 'unknown', userAgent: request.get('user-agent') ?? '', metadata: { type: body.type } });
    return { id: row.id, name: row.name, type: row.type, isActive: row.isActive };
  }

  async updateInsurance(actorId: string, id: string, body: UpdateInsuranceDto, request: RequestWithContext): Promise<{ updated: true }> {
    await this.prisma.insuranceProvider.update({ where: { id }, data: { ...(body.name !== undefined ? { name: body.name.trim() } : {}), ...(body.isActive !== undefined ? { isActive: body.isActive } : {}), ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}) } });
    await this.audit.record({ actorUserId: actorId, action: 'UPDATE_INSURANCE', entityType: 'InsuranceProvider', entityId: id, requestId: request.requestId, ipAddress: request.ip ?? 'unknown', userAgent: request.get('user-agent') ?? '', metadata: {} });
    return { updated: true };
  }

  async auditLogs(query: { action?: string; entityType?: string; requestId?: string; page?: string; limit?: string }): Promise<{ items: Array<Record<string, unknown>>; pagination: Record<string, number> }> {
    const page = Number.isInteger(Number(query.page)) && Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const where: Prisma.AuditLogWhereInput = { ...(query.action ? { action: query.action.slice(0, 80) } : {}), ...(query.entityType ? { entityType: query.entityType.slice(0, 80) } : {}), ...(query.requestId ? { requestId: query.requestId.slice(0, 100) } : {}) };
    const [total, rows] = await this.prisma.$transaction([this.prisma.auditLog.count({ where }), this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, select: { id: true, actorUserId: true, action: true, entityType: true, entityId: true, requestId: true, createdAt: true, metadataJson: true } })]);
    return { items: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }
}
