import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { type UserRole } from '@prisma/client';
import argon2 from 'argon2';
import {
  isCommonPassword,
  mobileSchema,
  normalizeDigits,
  normalizeMobile,
} from '@pharmacy-mvp/validation';
import { AuditService } from '../common/audit.service';
import { AppError } from '../common/errors';
import { maskMobile } from '../common/masking';
import { PrismaService } from '../common/prisma.service';
import { shiftTehranDays, startOfTehranDay, tehranDateKey } from '../common/tehran-time';
import type { RequestWithContext } from '../common/request-context';
import { PharmacyService } from '../pharmacy/pharmacy.service';
import { PrescriptionService } from '../prescriptions/prescription.service';
import type {
  CreateAdminPharmacyDto,
  CreateAdminUserDto,
  CreateInsuranceDto,
  AuditLogQueryDto,
  UpdateInsuranceDto,
  UpdateUserDto,
} from './admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pharmacy: PharmacyService,
    private readonly prescriptions: PrescriptionService,
    private readonly audit: AuditService,
  ) {}

  async dashboard(): Promise<Record<string, unknown>> {
    const now = new Date();
    const today = startOfTehranDay(now);
    const week = shiftTehranDays(today, -6);
    const month = shiftTehranDays(today, -29);
    const [
      todayCount,
      weekCount,
      monthCount,
      accepted,
      partial,
      rejected,
      activePharmacies,
      pendingRegistrations,
      responseRows,
      dailyRows,
    ] = await Promise.all([
      this.prisma.prescription.count({ where: { createdAt: { gte: today } } }),
      this.prisma.prescription.count({ where: { createdAt: { gte: week } } }),
      this.prisma.prescription.count({ where: { createdAt: { gte: month } } }),
      this.prisma.prescription.count({ where: { status: 'ACCEPTED' } }),
      this.prisma.prescription.count({ where: { status: 'PARTIAL' } }),
      this.prisma.prescription.count({ where: { status: 'REJECTED' } }),
      this.prisma.pharmacy.count({
        where: { registrationStatus: 'APPROVED', isActive: true, deletedAt: null },
      }),
      this.prisma.pharmacy.count({
        where: { registrationStatus: 'PENDING_APPROVAL', deletedAt: null },
      }),
      this.prisma.prescriptionPharmacyRequest.findMany({
        where: { respondedAt: { not: null }, sentAt: { gte: month } },
        select: { sentAt: true, respondedAt: true },
        take: 10_000,
      }),
      this.prisma.prescription.findMany({
        where: { createdAt: { gte: month } },
        select: { createdAt: true },
        take: 10_000,
      }),
    ]);
    const averageResponseMinutes = responseRows.length
      ? Math.round(
          responseRows.reduce(
            (sum, row) =>
              sum +
              ((row.respondedAt?.getTime() ?? row.sentAt.getTime()) - row.sentAt.getTime()) /
                60_000,
            0,
          ) / responseRows.length,
        )
      : 0;
    const dailyMap = new Map<string, number>();
    for (const row of dailyRows) {
      const key = tehranDateKey(row.createdAt);
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }
    return {
      requestsToday: todayCount,
      requestsWeek: weekCount,
      requestsMonth: monthCount,
      accepted,
      partial,
      rejected,
      activePharmacies,
      pendingRegistrations,
      averageResponseMinutes,
      dailyTrend: [...dailyMap.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, count]) => ({ date, count })),
    };
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

  documentUrl(pharmacyId: string, documentId: string) {
    return this.pharmacy.adminSignedDocumentUrl(pharmacyId, documentId);
  }

  reviewRegistration(
    id: string,
    adminId: string,
    action: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
    message: string | undefined,
    request: RequestWithContext,
  ) {
    return this.pharmacy.adminReview(
      id,
      adminId,
      action,
      message ? { message } : undefined,
      request,
    );
  }

  suspendPharmacy(id: string, adminId: string, request: RequestWithContext) {
    return this.pharmacy.adminSuspend(id, adminId, 'SUSPENDED', request);
  }

  reactivatePharmacy(id: string, adminId: string, request: RequestWithContext) {
    return this.pharmacy.adminSuspend(id, adminId, 'REACTIVATED', request);
  }

  async pharmacies(): Promise<Array<Record<string, unknown>>> {
    const rows = await this.prisma.pharmacy.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        mobile: true,
        province: true,
        city: true,
        registrationStatus: true,
        isActive: true,
        licenseExpirationDate: true,
        createdAt: true,
        _count: { select: { users: true, assignments: true } },
      },
    });
    return rows.map((row) => ({
      ...row,
      mobile: maskMobile(row.mobile),
      licenseExpirationDate: row.licenseExpirationDate.toISOString(),
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async pharmacyDetail(id: string): Promise<Record<string, unknown>> {
    return this.pharmacy.status(id);
  }

  async createPharmacy(
    actorId: string,
    body: CreateAdminPharmacyDto,
    request: RequestWithContext,
  ): Promise<{ id: string; status: 'DRAFT' }> {
    const mobile = mobileSchema.safeParse(normalizeMobile(body.mobile));
    const postalCode = normalizeDigits(body.postalCode).trim();
    if (!mobile.success || !/^\d{10}$/.test(postalCode)) {
      const fields: Record<string, string> = {};
      if (!mobile.success) fields.mobile = 'شماره موبایل معتبر نیست.';
      if (!/^\d{10}$/.test(postalCode)) fields.postalCode = 'کد پستی باید ۱۰ رقم باشد.';
      throw new AppError('VALIDATION_ERROR', 'اطلاعات تماس یا کد پستی معتبر نیست.', 422, fields);
    }
    const pharmacy = await this.prisma.pharmacy.create({
      data: {
        name: body.name.trim(),
        technicalManager: body.technicalManager.trim(),
        technicalManagerIdentifier: body.technicalManagerIdentifier?.trim() || null,
        pharmacyIdentifier: body.pharmacyIdentifier?.trim() || null,
        licenseNumber: body.licenseNumber.trim(),
        licenseExpirationDate: new Date(body.licenseExpirationDate),
        mobile: mobile.data,
        phone: body.phone.trim(),
        province: body.province.trim(),
        city: body.city.trim(),
        address: body.address.trim(),
        postalCode,
        workingHours: body.workingHours.trim(),
      },
    });
    await this.audit.record({
      actorUserId: actorId,
      action: 'CREATE_PHARMACY',
      entityType: 'Pharmacy',
      entityId: pharmacy.id,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { pharmacyId: pharmacy.id, source: 'admin' },
    });
    return { id: pharmacy.id, status: 'DRAFT' };
  }

  async updatePharmacy(
    actorId: string,
    id: string,
    body: CreateAdminPharmacyDto,
    request: RequestWithContext,
  ): Promise<{ updated: true }> {
    const mobile = mobileSchema.safeParse(normalizeMobile(body.mobile));
    const postalCode = normalizeDigits(body.postalCode).trim();
    if (!mobile.success || !/^\d{10}$/.test(postalCode)) {
      const fields: Record<string, string> = {};
      if (!mobile.success) fields.mobile = 'شماره موبایل معتبر نیست.';
      if (!/^\d{10}$/.test(postalCode)) fields.postalCode = 'کد پستی باید ۱۰ رقم باشد.';
      throw new AppError('VALIDATION_ERROR', 'اطلاعات تماس یا کد پستی معتبر نیست.', 422, fields);
    }
    await this.prisma.pharmacy.update({
      where: { id },
      data: {
        name: body.name.trim(),
        technicalManager: body.technicalManager.trim(),
        technicalManagerIdentifier: body.technicalManagerIdentifier?.trim() || null,
        pharmacyIdentifier: body.pharmacyIdentifier?.trim() || null,
        licenseNumber: body.licenseNumber.trim(),
        licenseExpirationDate: new Date(body.licenseExpirationDate),
        mobile: mobile.data,
        phone: body.phone.trim(),
        province: body.province.trim(),
        city: body.city.trim(),
        address: body.address.trim(),
        postalCode,
        workingHours: body.workingHours.trim(),
      },
    });
    await this.audit.record({
      actorUserId: actorId,
      action: 'UPDATE_PHARMACY',
      entityType: 'Pharmacy',
      entityId: id,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { pharmacyId: id, source: 'admin' },
    });
    return { updated: true };
  }

  async softDeletePharmacy(
    id: string,
    adminId: string,
    request: RequestWithContext,
  ): Promise<{ deleted: true }> {
    const pharmacy = await this.prisma.pharmacy.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!pharmacy) throw new AppError('NOT_FOUND', 'داروخانه پیدا نشد.', 404);
    await this.prisma.pharmacy.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, registrationStatus: 'SUSPENDED' },
    });
    await this.audit.record({
      actorUserId: adminId,
      action: 'SUSPEND_PHARMACY',
      entityType: 'Pharmacy',
      entityId: id,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { pharmacyId: id, softDeleted: true },
    });
    return { deleted: true };
  }

  async users(): Promise<Array<Record<string, unknown>>> {
    const rows = await this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        mobile: true,
        role: true,
        pharmacyId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        pharmacy: { select: { name: true } },
      },
    });
    return rows.map((row) => ({
      ...row,
      mobile: maskMobile(row.mobile),
      lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async createUser(
    actor: { id: string; role: UserRole },
    body: CreateAdminUserDto,
    request: RequestWithContext,
  ): Promise<{ id: string }> {
    if (body.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN')
      throw new AppError('FORBIDDEN', 'ساخت SUPER_ADMIN مجاز نیست.', 403);
    if (['PHARMACY_ADMIN', 'PHARMACY_USER'].includes(body.role) && !body.pharmacyId)
      throw new AppError('VALIDATION_ERROR', 'داروخانه کاربر را مشخص کنید.', 422);
    if (['ADMIN', 'SUPER_ADMIN'].includes(body.role) && body.pharmacyId)
      throw new AppError('VALIDATION_ERROR', 'کاربر مدیریتی نباید به داروخانه متصل باشد.', 422);
    if (body.pharmacyId) {
      const pharmacy = await this.prisma.pharmacy.findFirst({
        where: { id: body.pharmacyId, deletedAt: null },
        select: { id: true },
      });
      if (!pharmacy) throw new AppError('NOT_FOUND', 'داروخانه پیدا نشد.', 404);
    }
    const mobile = mobileSchema.safeParse(normalizeMobile(body.mobile));
    if (!mobile.success)
      throw new AppError('VALIDATION_ERROR', 'شماره موبایل معتبر نیست.', 422, {
        mobile: 'شماره موبایل معتبر نیست.',
      });
    if (isCommonPassword(body.password))
      throw new AppError('VALIDATION_ERROR', 'رمز عبور انتخاب‌شده رایج است.', 422, {
        password: 'یک رمز عبور قوی‌تر انتخاب کنید.',
      });
    const passwordHash = await argon2.hash(body.password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({
      data: {
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        username: body.username.trim().toLowerCase(),
        mobile: mobile.data,
        passwordHash,
        role: body.role,
        pharmacyId: body.pharmacyId ?? null,
      },
    });
    await this.audit.record({
      actorUserId: actor.id,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user.id,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { role: body.role },
    });
    return { id: user.id };
  }

  async updateUser(
    actor: { id: string; role: UserRole },
    id: string,
    body: UpdateUserDto,
    request: RequestWithContext,
  ): Promise<{ updated: true }> {
    const target = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, role: true, pharmacyId: true },
    });
    if (!target) throw new AppError('NOT_FOUND', 'کاربر پیدا نشد.', 404);
    if (
      actor.role !== 'SUPER_ADMIN' &&
      (target.role === 'SUPER_ADMIN' || body.role === 'SUPER_ADMIN')
    )
      throw new AppError('FORBIDDEN', 'مدیریت SUPER_ADMIN فقط برای SUPER_ADMIN مجاز است.', 403);
    if (target.id === actor.id && body.isActive === false)
      throw new AppError('CONFLICT', 'غیرفعال کردن کاربر جاری مجاز نیست.', 409);
    if ((body.role === 'ADMIN' || body.role === 'SUPER_ADMIN') && target.pharmacyId)
      throw new AppError('VALIDATION_ERROR', 'کاربر داروخانه را نمی‌توان مدیر سامانه کرد.', 422);
    if ((body.role === 'PHARMACY_ADMIN' || body.role === 'PHARMACY_USER') && !target.pharmacyId)
      throw new AppError('VALIDATION_ERROR', 'برای کاربر داروخانه باید داروخانه تعیین شود.', 422);
    const mobile =
      body.mobile === undefined ? undefined : mobileSchema.safeParse(normalizeMobile(body.mobile));
    if (mobile && !mobile.success)
      throw new AppError('VALIDATION_ERROR', 'شماره موبایل معتبر نیست.', 422, {
        mobile: 'شماره موبایل معتبر نیست.',
      });
    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id },
        data: {
          ...(body.firstName !== undefined ? { firstName: body.firstName.trim() } : {}),
          ...(body.lastName !== undefined ? { lastName: body.lastName.trim() } : {}),
          ...(mobile?.success ? { mobile: mobile.data } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          ...(body.role !== undefined ? { role: body.role } : {}),
        },
      });
      if (body.isActive === false)
        await transaction.refreshSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
    });
    await this.audit.record({
      actorUserId: actor.id,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: id,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { fields: Object.keys(body) },
    });
    return { updated: true };
  }

  async disableUser(
    actor: { id: string; role: UserRole },
    id: string,
    request: RequestWithContext,
  ): Promise<{ disabled: true }> {
    const target = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!target) throw new AppError('NOT_FOUND', 'کاربر پیدا نشد.', 404);
    if (target.id === actor.id)
      throw new AppError('CONFLICT', 'غیرفعال کردن کاربر جاری مجاز نیست.', 409);
    if (target.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN')
      throw new AppError(
        'FORBIDDEN',
        'غیرفعال کردن SUPER_ADMIN فقط برای SUPER_ADMIN مجاز است.',
        403,
      );
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { isActive: false } }),
      this.prisma.refreshSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.audit.record({
      actorUserId: actor.id,
      action: 'DISABLE_USER',
      entityType: 'User',
      entityId: id,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: {},
    });
    return { disabled: true };
  }

  async enableUser(
    actor: { id: string; role: UserRole },
    id: string,
    request: RequestWithContext,
  ): Promise<{ enabled: true }> {
    const target = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!target) throw new AppError('NOT_FOUND', 'کاربر پیدا نشد.', 404);
    if (target.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN')
      throw new AppError('FORBIDDEN', 'فعال کردن SUPER_ADMIN فقط برای SUPER_ADMIN مجاز است.', 403);
    await this.prisma.user.update({ where: { id }, data: { isActive: true } });
    await this.audit.record({
      actorUserId: actor.id,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: id,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { enabled: true },
    });
    return { enabled: true };
  }

  async resetPassword(
    actor: { id: string; role: UserRole },
    id: string,
    password: string,
    request: RequestWithContext,
  ): Promise<{ reset: true }> {
    if (password.length < 10 || password.length > 128 || isCommonPassword(password))
      throw new AppError('VALIDATION_ERROR', 'رمز عبور معتبر نیست.', 422, {
        password: 'رمز عبور باید ۱۰ تا ۱۲۸ کاراکتر و غیررایج باشد.',
      });
    const target = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { role: true },
    });
    if (!target) throw new AppError('NOT_FOUND', 'کاربر پیدا نشد.', 404);
    if (target.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN')
      throw new AppError('FORBIDDEN', 'تغییر رمز SUPER_ADMIN فقط برای SUPER_ADMIN مجاز است.', 403);
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
      }),
      this.prisma.refreshSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.audit.record({
      actorUserId: actor.id,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: id,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { passwordReset: true },
    });
    return { reset: true };
  }

  async insurance(): Promise<Array<Record<string, unknown>>> {
    const rows = await this.prisma.insuranceProvider.findMany({
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    }));
  }

  async createInsurance(
    actorId: string,
    body: CreateInsuranceDto,
    request: RequestWithContext,
  ): Promise<Record<string, unknown>> {
    const row = await this.prisma.insuranceProvider.create({
      data: { name: body.name.trim(), type: body.type, isActive: body.isActive ?? true },
    });
    await this.audit.record({
      actorUserId: actorId,
      action: 'UPDATE_INSURANCE',
      entityType: 'InsuranceProvider',
      entityId: row.id,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { type: body.type },
    });
    return { id: row.id, name: row.name, type: row.type, isActive: row.isActive };
  }

  async updateInsurance(
    actorId: string,
    id: string,
    body: UpdateInsuranceDto,
    request: RequestWithContext,
  ): Promise<{ updated: true }> {
    await this.prisma.insuranceProvider.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      },
    });
    await this.audit.record({
      actorUserId: actorId,
      action: 'UPDATE_INSURANCE',
      entityType: 'InsuranceProvider',
      entityId: id,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: {},
    });
    return { updated: true };
  }

  async toggleInsurance(
    actorId: string,
    id: string,
    request: RequestWithContext,
  ): Promise<{ isActive: boolean }> {
    const current = await this.prisma.insuranceProvider.findUnique({ where: { id } });
    if (!current) throw new AppError('NOT_FOUND', 'بیمه پیدا نشد.', 404);
    const updated = await this.prisma.insuranceProvider.update({
      where: { id },
      data: { isActive: !current.isActive },
    });
    await this.audit.record({
      actorUserId: actorId,
      action: 'UPDATE_INSURANCE',
      entityType: 'InsuranceProvider',
      entityId: id,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { isActive: updated.isActive },
    });
    return { isActive: updated.isActive };
  }

  async auditLogs(
    query: AuditLogQueryDto,
  ): Promise<{ items: Array<Record<string, unknown>>; pagination: Record<string, number> }> {
    const page =
      Number.isInteger(Number(query.page)) && Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const dateRange = this.parseAuditDateRange(query.dateFrom, query.dateTo);
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: query.action.slice(0, 80) } : {}),
      ...(query.entityType ? { entityType: query.entityType.slice(0, 80) } : {}),
      ...(query.requestId ? { requestId: query.requestId.slice(0, 100) } : {}),
      ...(query.actor
        ? { actor: { username: { contains: query.actor.trim(), mode: 'insensitive' } } }
        : {}),
      ...(dateRange ? { createdAt: dateRange } : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          actorUserId: true,
          action: true,
          entityType: true,
          entityId: true,
          requestId: true,
          createdAt: true,
          metadataJson: true,
          actor: { select: { username: true } },
        },
      }),
    ]);
    return {
      items: rows.map((row) => ({
        ...row,
        actor: row.actor?.username ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  private parseAuditDateRange(
    dateFrom: string | undefined,
    dateTo: string | undefined,
  ): { gte?: Date; lt?: Date } | undefined {
    if (!dateFrom && !dateTo) return undefined;
    const range: { gte?: Date; lt?: Date } = {};
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (Number.isNaN(from.getTime()))
        throw new AppError('VALIDATION_ERROR', 'تاریخ شروع معتبر نیست.', 422, {
          dateFrom: 'تاریخ شروع معتبر نیست.',
        });
      range.gte = from;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (Number.isNaN(to.getTime()))
        throw new AppError('VALIDATION_ERROR', 'تاریخ پایان معتبر نیست.', 422, {
          dateTo: 'تاریخ پایان معتبر نیست.',
        });
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) to.setUTCDate(to.getUTCDate() + 1);
      range.lt = to;
    }
    if (range.gte && range.lt && range.gte >= range.lt)
      throw new AppError('VALIDATION_ERROR', 'بازه تاریخ معتبر نیست.', 422, {
        dateTo: 'تاریخ پایان باید بعد از تاریخ شروع باشد.',
      });
    return range;
  }
}
