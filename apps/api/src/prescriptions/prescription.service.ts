import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type AvailabilityStatus,
  type PrescriptionRequestStatus,
  type PrescriptionStatus,
} from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { AppEnvironment } from '@pharmacy-mvp/config';
import { ConfigService } from '@nestjs/config';
import { prescriptionCreateSchema, pharmacyResponseSchema } from '@pharmacy-mvp/validation';
import { AuditService } from '../common/audit.service';
import { AppError, conflict, publicNotFound } from '../common/errors';
import { MAX_PAGE_LIMIT } from '../common/constants';
import { maskMobile, maskNationalId } from '../common/masking';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';
import type { RequestWithContext } from '../common/request-context';
import { startOfTehranDay } from '../common/tehran-time';
import { hashOpaqueToken, verifyOpaqueToken } from '../common/token-hash';
import { InsuranceService } from '../insurance/insurance.service';
import { aggregatePrescriptionStatus } from './status-aggregator';
import type {
  CreatePrescriptionDto,
  PrescriptionListQueryDto,
  RespondPrescriptionDto,
} from './prescription.dto';

const PUBLIC_ID_PATTERN = /^RX-[A-Z0-9]{8}$/;
const ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const isValidPublicId = (value: string): boolean => PUBLIC_ID_PATTERN.test(value);

export interface PublicPrescriptionData {
  publicId: string;
  accessToken: string;
  status: PrescriptionStatus;
  statusUrl: string;
  expiresAt: string;
}

interface PrescriptionIdempotencyRecord {
  fingerprint: string;
  response: PublicPrescriptionData;
}

@Injectable()
export class PrescriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppEnvironment, true>,
    private readonly insurance: InsuranceService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async create(
    body: CreatePrescriptionDto,
    request: RequestWithContext,
  ): Promise<PublicPrescriptionData> {
    const idempotencyKey = request.header('idempotency-key');
    const validIdempotencyKey = Boolean(
      idempotencyKey && /^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey),
    );
    const idempotencyCacheKey = validIdempotencyKey
      ? `pharmacy-mvp:idempotency:prescription:${createHash('sha256')
          .update(`${request.ip ?? 'unknown'}:${idempotencyKey}`)
          .digest('hex')}`
      : null;
    const requestFingerprint = createHash('sha256')
      .update(
        JSON.stringify({
          mobile: body.mobile,
          nationalId: body.nationalId,
          prescriptionTrackingCode: body.prescriptionTrackingCode,
          baseInsuranceId: body.baseInsuranceId,
          hasSupplementaryInsurance: body.hasSupplementaryInsurance,
          supplementaryInsuranceId: body.supplementaryInsuranceId ?? null,
          supplementaryDescription: body.supplementaryDescription ?? null,
          patientDescription: body.patientDescription ?? null,
          honeypot: body.honeypot ?? '',
        }),
      )
      .digest('hex');
    if (idempotencyCacheKey) {
      const cached = await this.redis.getJson<PrescriptionIdempotencyRecord>(idempotencyCacheKey);
      if (cached) {
        if (cached.fingerprint !== requestFingerprint)
          throw conflict(
            'IDEMPOTENCY_KEY_REUSE',
            'کلید تکرارنشدن برای اطلاعات دیگری قبلاً استفاده شده است.',
          );
        return cached.response;
      }
    }
    const createAllowed = await this.redis.consumeRateLimit(
      `pharmacy-mvp:prescription-create:${request.ip ?? 'unknown'}`,
      this.config.get('PRESCRIPTION_CREATE_RATE_LIMIT'),
      this.config.get('PRESCRIPTION_CREATE_RATE_WINDOW_SECONDS'),
    );
    if (!createAllowed)
      throw new AppError('RATE_LIMITED', 'تعداد ثبت درخواست بیش از حد مجاز است.', 429);
    const parsed = prescriptionCreateSchema.safeParse({
      mobile: body.mobile,
      nationalId: body.nationalId,
      prescriptionTrackingCode: body.prescriptionTrackingCode,
      baseInsuranceId: body.baseInsuranceId,
      hasSupplementaryInsurance: body.hasSupplementaryInsurance,
      supplementaryInsuranceId: body.supplementaryInsuranceId ?? null,
      supplementaryDescription: body.supplementaryDescription ?? null,
      patientDescription: body.patientDescription ?? null,
      honeypot: body.honeypot ?? '',
    });
    if (!parsed.success) {
      const fields = Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0] ?? 'form'), issue.message]),
      );
      throw new AppError('VALIDATION_ERROR', 'اطلاعات واردشده معتبر نیست.', 422, fields);
    }
    if (parsed.data.honeypot)
      throw new AppError('VALIDATION_ERROR', 'اطلاعات واردشده معتبر نیست.', 422);
    await this.insurance.assertActive(parsed.data.baseInsuranceId, 'BASE').catch(() => {
      throw new AppError('VALIDATION_ERROR', 'بیمه پایه انتخاب‌شده معتبر نیست.', 422, {
        baseInsuranceId: 'بیمه پایه انتخاب‌شده معتبر نیست.',
      });
    });
    if (parsed.data.hasSupplementaryInsurance) {
      await this.insurance
        .assertActive(parsed.data.supplementaryInsuranceId as string, 'SUPPLEMENTARY')
        .catch(() => {
          throw new AppError('VALIDATION_ERROR', 'بیمه تکمیلی انتخاب‌شده معتبر نیست.', 422, {
            supplementaryInsuranceId: 'بیمه تکمیلی انتخاب‌شده معتبر نیست.',
          });
        });
    }

    let idempotencyLockKey: string | null = null;
    let idempotencyLockValue: string | null = null;
    if (idempotencyCacheKey && this.redis.client.status === 'ready') {
      idempotencyLockKey = `${idempotencyCacheKey}:lock`;
      idempotencyLockValue = randomUUID();
      const acquired = await this.redis.setIfNotExists(
        idempotencyLockKey,
        idempotencyLockValue,
        30,
      );
      if (!acquired) {
        const cached = await this.redis.getJson<PrescriptionIdempotencyRecord>(idempotencyCacheKey);
        if (cached) {
          if (cached.fingerprint !== requestFingerprint)
            throw conflict(
              'IDEMPOTENCY_KEY_REUSE',
              'کلید تکرارنشدن برای اطلاعات دیگری قبلاً استفاده شده است.',
            );
          return cached.response;
        }
        throw conflict('IDEMPOTENCY_IN_PROGRESS', 'درخواست مشابهی در حال پردازش است.');
      }
    }

    try {
      const accessToken = randomBytes(32).toString('base64url');
      const publicId = await this.generatePublicId();
      const expiresAt = new Date(
        Date.now() + this.config.get('PRESCRIPTION_EXPIRATION_HOURS') * 3_600_000,
      );
      const transactionResult = await this.prisma.$transaction(async (transaction) => {
        const pharmacies = await transaction.pharmacy.findMany({
          where: {
            registrationStatus: 'APPROVED',
            isActive: true,
            deletedAt: null,
            licenseExpirationDate: { gt: new Date() },
          },
          select: { id: true },
        });
        const created = await transaction.prescription.create({
          data: {
            publicId,
            accessTokenHash: hashOpaqueToken(accessToken),
            mobile: parsed.data.mobile,
            nationalId: parsed.data.nationalId,
            prescriptionTrackingCode: parsed.data.prescriptionTrackingCode,
            baseInsuranceId: parsed.data.baseInsuranceId,
            hasSupplementaryInsurance: parsed.data.hasSupplementaryInsurance,
            supplementaryInsuranceId: parsed.data.hasSupplementaryInsurance
              ? (parsed.data.supplementaryInsuranceId ?? null)
              : null,
            supplementaryDescription: parsed.data.hasSupplementaryInsurance
              ? parsed.data.supplementaryDescription || null
              : null,
            patientDescription: parsed.data.patientDescription || null,
            expiresAt,
            assignments: { create: pharmacies.map(({ id }) => ({ pharmacyId: id })) },
          },
          select: { id: true, publicId: true, status: true, expiresAt: true },
        });
        if (pharmacies.length) {
          await transaction.notification.createMany({
            data: pharmacies.map(({ id }) => ({
              pharmacyId: id,
              type: 'NEW_PRESCRIPTION',
              entityId: created.id,
              title: 'درخواست نسخه جدید',
              body: 'یک درخواست نسخه جدید برای بررسی شما ارسال شده است.',
            })),
          });
        }
        return { prescription: created, pharmacyCount: pharmacies.length };
      });
      const prescription = transactionResult.prescription;
      const result: PublicPrescriptionData = {
        publicId: prescription.publicId,
        accessToken,
        status: prescription.status,
        statusUrl: `${this.config.get('WEB_APP_URL')}/request/${prescription.publicId}?token=${encodeURIComponent(accessToken)}`,
        expiresAt: prescription.expiresAt.toISOString(),
      };
      if (idempotencyCacheKey)
        await this.redis.setJson(
          idempotencyCacheKey,
          { fingerprint: requestFingerprint, response: result },
          900,
        );
      await this.audit.record({
        action: 'CREATE_PRESCRIPTION',
        entityType: 'Prescription',
        entityId: prescription.id,
        requestId: request.requestId,
        ipAddress: request.ip ?? 'unknown',
        userAgent: request.get('user-agent') ?? '',
        metadata: {
          publicId: prescription.publicId,
          pharmacyCount: transactionResult.pharmacyCount,
        },
      });
      return result;
    } finally {
      if (idempotencyLockKey && idempotencyLockValue)
        await this.redis.deleteIfValue(idempotencyLockKey, idempotencyLockValue);
    }
  }

  async getPublic(
    publicId: string,
    rawToken: string | undefined,
    request: RequestWithContext,
  ): Promise<Record<string, unknown>> {
    if (!isValidPublicId(publicId)) throw publicNotFound();
    const publicAllowed = await this.redis.consumeRateLimit(
      `pharmacy-mvp:prescription-status:${request.ip ?? 'unknown'}:${publicId}`,
      60,
      60,
    );
    if (!publicAllowed)
      throw new AppError('RATE_LIMITED', 'تعداد درخواست‌ها بیش از حد مجاز است.', 429);
    const prescription = await this.findByPublicToken(publicId, rawToken);
    await this.expireIfNeeded(
      prescription.id,
      prescription.expiresAt,
      prescription.selectedPharmacyId,
      prescription.cancelledAt,
      prescription.completedAt,
    );
    const data = await this.prisma.prescription.findUnique({
      where: { id: prescription.id },
      include: {
        assignments: { include: { pharmacy: true }, orderBy: { createdAt: 'asc' } },
        responses: { include: { pharmacy: true }, orderBy: { respondedAt: 'desc' } },
      },
    });
    if (!data) throw publicNotFound();
    const responseByPharmacy = new Map(
      data.responses.map((response) => [response.pharmacyId, response]),
    );
    const sortedResponses = data.assignments
      .map((assignment) => {
        const response = responseByPharmacy.get(assignment.pharmacyId);
        if (!response) return null;
        return {
          id: response.id,
          pharmacyId: response.pharmacyId,
          pharmacyName: assignment.pharmacy.name,
          availabilityStatus: response.availabilityStatus,
          description: response.description,
          respondedAt: response.respondedAt.toISOString(),
          address: assignment.pharmacy.address,
          province: assignment.pharmacy.province,
          city: assignment.pharmacy.city,
          workingHours: assignment.pharmacy.workingHours,
          isSelectable:
            (response.availabilityStatus === 'FULL_AVAILABLE' ||
              response.availabilityStatus === 'PARTIAL_AVAILABLE') &&
            data.status !== 'CANCELLED' &&
            data.status !== 'EXPIRED' &&
            data.status !== 'COMPLETED' &&
            !data.selectedPharmacyId &&
            assignment.pharmacy.registrationStatus === 'APPROVED' &&
            assignment.pharmacy.isActive &&
            assignment.pharmacy.licenseExpirationDate > new Date(),
        };
      })
      .filter((response): response is NonNullable<typeof response> => response !== null)
      .sort(
        (left, right) =>
          this.availabilityRank(left.availabilityStatus) -
          this.availabilityRank(right.availabilityStatus),
      );
    return {
      publicId: data.publicId,
      status: data.status,
      expiresAt: data.expiresAt.toISOString(),
      createdAt: data.createdAt.toISOString(),
      selectedPharmacyId: data.selectedPharmacyId,
      pharmaciesCount: data.assignments.length,
      respondedCount: data.responses.length,
      responses: sortedResponses,
    };
  }

  async selectPharmacy(
    publicId: string,
    rawToken: string | undefined,
    pharmacyId: string,
    request: RequestWithContext,
  ): Promise<{ selectedPharmacyId: string; status: 'SELECTED_PHARMACY' }> {
    await this.consumePublicMutationRateLimit(publicId, request);
    const prescription = await this.findByPublicToken(publicId, rawToken);
    const now = new Date();
    if (prescription.cancelledAt || prescription.completedAt || prescription.selectedPharmacyId)
      throw conflict('PRESCRIPTION_CLOSED', 'این درخواست دیگر قابل انتخاب نیست.');
    if (prescription.expiresAt <= now) {
      await this.expireIfNeeded(
        prescription.id,
        prescription.expiresAt,
        prescription.selectedPharmacyId,
        prescription.cancelledAt,
        prescription.completedAt,
      );
      throw new AppError('PRESCRIPTION_EXPIRED', 'مهلت این درخواست به پایان رسیده است.', 410);
    }
    await this.prisma.$transaction(async (transaction) => {
      const candidate = await transaction.pharmacy.findFirst({
        where: {
          id: pharmacyId,
          registrationStatus: 'APPROVED',
          isActive: true,
          deletedAt: null,
          licenseExpirationDate: { gt: now },
        },
        select: { id: true },
      });
      if (!candidate)
        throw new AppError('PHARMACY_NOT_SELECTABLE', 'داروخانه انتخاب‌شده دیگر فعال نیست.', 409);
      const assignment = await transaction.prescriptionPharmacyRequest.findUnique({
        where: { prescriptionId_pharmacyId: { prescriptionId: prescription.id, pharmacyId } },
        select: { status: true },
      });
      if (!assignment || ['CLOSED', 'EXPIRED', 'SELECTED'].includes(assignment.status))
        throw new AppError(
          'PHARMACY_NOT_SELECTABLE',
          'این داروخانه دیگر در این درخواست فعال نیست.',
          409,
        );
      const response = await transaction.pharmacyResponse.findUnique({
        where: { prescriptionId_pharmacyId: { prescriptionId: prescription.id, pharmacyId } },
        select: { availabilityStatus: true },
      });
      if (
        !response ||
        (response.availabilityStatus !== 'FULL_AVAILABLE' &&
          response.availabilityStatus !== 'PARTIAL_AVAILABLE')
      )
        throw new AppError(
          'PHARMACY_NOT_SELECTABLE',
          'این داروخانه پاسخ قابل انتخابی ثبت نکرده است.',
          409,
        );
      const update = await transaction.prescription.updateMany({
        where: {
          id: prescription.id,
          selectedPharmacyId: null,
          cancelledAt: null,
          completedAt: null,
          expiresAt: { gt: now },
        },
        data: { selectedPharmacyId: pharmacyId, status: 'SELECTED_PHARMACY' },
      });
      if (update.count !== 1)
        throw conflict(
          'PRESCRIPTION_ALREADY_SELECTED',
          'این درخواست قبلاً توسط شما یا کاربر دیگری انتخاب شده است.',
        );
      await transaction.prescriptionPharmacyRequest.update({
        where: { prescriptionId_pharmacyId: { prescriptionId: prescription.id, pharmacyId } },
        data: { status: 'SELECTED' },
      });
      await transaction.prescriptionPharmacyRequest.updateMany({
        where: {
          prescriptionId: prescription.id,
          pharmacyId: { not: pharmacyId },
          status: { notIn: ['EXPIRED', 'CLOSED'] },
        },
        data: { status: 'CLOSED', closedAt: now },
      });
    });
    await this.audit.record({
      action: 'SELECT_PHARMACY',
      entityType: 'Prescription',
      entityId: prescription.id,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { publicId: prescription.publicId, selectedPharmacyId: pharmacyId },
    });
    return { selectedPharmacyId: pharmacyId, status: 'SELECTED_PHARMACY' };
  }

  async cancel(
    publicId: string,
    rawToken: string | undefined,
    request: RequestWithContext,
  ): Promise<{ status: 'CANCELLED' }> {
    await this.consumePublicMutationRateLimit(publicId, request);
    const prescription = await this.findByPublicToken(publicId, rawToken);
    const now = new Date();
    if (prescription.expiresAt <= now) {
      await this.expireIfNeeded(
        prescription.id,
        prescription.expiresAt,
        prescription.selectedPharmacyId,
        prescription.cancelledAt,
        prescription.completedAt,
      );
      throw new AppError('PRESCRIPTION_EXPIRED', 'مهلت این درخواست به پایان رسیده است.', 410);
    }
    await this.prisma.$transaction(async (transaction) => {
      const update = await transaction.prescription.updateMany({
        where: {
          id: prescription.id,
          selectedPharmacyId: null,
          cancelledAt: null,
          completedAt: null,
          expiresAt: { gt: now },
        },
        data: { status: 'CANCELLED', cancelledAt: now },
      });
      if (update.count !== 1)
        throw conflict('PRESCRIPTION_CLOSED', 'این درخواست دیگر قابل لغو نیست.');
      await transaction.prescriptionPharmacyRequest.updateMany({
        where: { prescriptionId: prescription.id, status: { notIn: ['CLOSED', 'EXPIRED'] } },
        data: { status: 'CLOSED', closedAt: now },
      });
    });
    await this.audit.record({
      action: 'CANCEL_PRESCRIPTION',
      entityType: 'Prescription',
      entityId: prescription.id,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { publicId },
    });
    return { status: 'CANCELLED' };
  }

  async complete(
    publicId: string,
    rawToken: string | undefined,
    request: RequestWithContext,
  ): Promise<{ status: 'COMPLETED' }> {
    await this.consumePublicMutationRateLimit(publicId, request);
    const prescription = await this.findByPublicToken(publicId, rawToken);
    if (!prescription.selectedPharmacyId)
      throw conflict('PHARMACY_NOT_SELECTED', 'ابتدا یک داروخانه را انتخاب کنید.');
    const update = await this.prisma.prescription.updateMany({
      where: {
        id: prescription.id,
        selectedPharmacyId: { not: null },
        completedAt: null,
        cancelledAt: null,
      },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    if (update.count !== 1)
      throw conflict('PRESCRIPTION_CLOSED', 'این درخواست قبلاً تکمیل شده است.');
    await this.audit.record({
      action: 'COMPLETE_PRESCRIPTION',
      entityType: 'Prescription',
      entityId: prescription.id,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { publicId },
    });
    return { status: 'COMPLETED' };
  }

  async listForPharmacy(
    pharmacyId: string,
    query: PrescriptionListQueryDto,
  ): Promise<{
    items: Array<Record<string, unknown>>;
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const page = this.safePage(query.page);
    const limit = this.safeLimit(query.limit);
    const dateRange = this.parseDateRange(query.dateFrom, query.dateTo);
    const where: Prisma.PrescriptionPharmacyRequestWhereInput = {
      pharmacyId,
      ...(dateRange ? { sentAt: dateRange } : {}),
      ...(query.status &&
      ['SENT', 'VIEWED', 'RESPONDED', 'SELECTED', 'CLOSED', 'EXPIRED'].includes(query.status)
        ? { status: query.status as PrescriptionRequestStatus }
        : {}),
      ...(query.search
        ? {
            prescription: {
              OR: [
                { publicId: { contains: query.search.trim(), mode: 'insensitive' } },
                {
                  prescriptionTrackingCode: { contains: query.search.trim(), mode: 'insensitive' },
                },
              ],
            },
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.prescriptionPharmacyRequest.count({ where }),
      this.prisma.prescriptionPharmacyRequest.findMany({
        where,
        orderBy: { sentAt: query.sort === 'oldest' ? 'asc' : 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          prescription: {
            include: {
              baseInsurance: true,
              supplementaryInsurance: true,
              responses: { where: { pharmacyId } },
            },
          },
        },
      }),
    ]);
    return {
      items: rows.map((row) => this.mapPharmacyRow(row)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getForPharmacy(
    id: string,
    pharmacyId: string,
    request: RequestWithContext,
  ): Promise<Record<string, unknown>> {
    let row = await this.prisma.prescriptionPharmacyRequest.findFirst({
      where: { id, pharmacyId },
      include: {
        prescription: {
          include: {
            baseInsurance: true,
            supplementaryInsurance: true,
            responses: { where: { pharmacyId } },
            selectedPharmacy: true,
          },
        },
        pharmacy: true,
      },
    });
    if (!row) throw new AppError('NOT_FOUND', 'درخواست موردنظر پیدا نشد.', 404);
    const isExpired = row.prescription.expiresAt <= new Date();
    await this.expireIfNeeded(
      row.prescriptionId,
      row.prescription.expiresAt,
      row.prescription.selectedPharmacyId,
      row.prescription.cancelledAt,
      row.prescription.completedAt,
    );
    if (row.status === 'SENT' && !isExpired) {
      const viewed = await this.prisma.prescriptionPharmacyRequest.updateMany({
        where: { id: row.id, pharmacyId, status: 'SENT' },
        data: { status: 'VIEWED', seenAt: new Date() },
      });
      if (viewed.count === 1) {
        await this.prisma.notification.updateMany({
          where: {
            pharmacyId,
            entityId: row.prescriptionId,
            type: 'NEW_PRESCRIPTION',
            readAt: null,
          },
          data: { readAt: new Date() },
        });
        await this.refreshAggregate(row.prescriptionId);
        await this.audit.record({
          actorUserId: request.user?.id,
          action: 'VIEW_PRESCRIPTION',
          entityType: 'Prescription',
          entityId: row.prescriptionId,
          requestId: request.requestId,
          ipAddress: request.ip ?? 'unknown',
          userAgent: request.get('user-agent') ?? '',
          metadata: { pharmacyId },
        });
      }
    }
    if (row.status === 'SENT' || isExpired) {
      const refreshed = await this.prisma.prescriptionPharmacyRequest.findFirst({
        where: { id, pharmacyId },
        include: {
          prescription: {
            include: {
              baseInsurance: true,
              supplementaryInsurance: true,
              responses: { where: { pharmacyId } },
              selectedPharmacy: true,
            },
          },
          pharmacy: true,
        },
      });
      if (!refreshed) throw new AppError('NOT_FOUND', 'درخواست موردنظر پیدا نشد.', 404);
      row = refreshed;
    }
    return this.mapPharmacyDetail(row);
  }

  async respond(
    id: string,
    pharmacyId: string,
    userId: string,
    body: RespondPrescriptionDto,
    request: RequestWithContext,
  ): Promise<Record<string, unknown>> {
    const parsed = pharmacyResponseSchema.safeParse({
      availabilityStatus: body.availabilityStatus,
      description: body.description ?? null,
    });
    if (!parsed.success)
      throw new AppError('VALIDATION_ERROR', 'اطلاعات پاسخ معتبر نیست.', 422, {
        description: parsed.error.issues[0]?.message ?? 'پاسخ معتبر نیست.',
      });
    const row = await this.prisma.prescriptionPharmacyRequest.findFirst({
      where: { id, pharmacyId },
      include: { prescription: true },
    });
    if (!row) throw new AppError('NOT_FOUND', 'درخواست موردنظر پیدا نشد.', 404);
    const now = new Date();
    if (row.prescription.expiresAt <= now) {
      await this.expireIfNeeded(
        row.prescriptionId,
        row.prescription.expiresAt,
        row.prescription.selectedPharmacyId,
        row.prescription.cancelledAt,
        row.prescription.completedAt,
      );
      throw new AppError(
        'PRESCRIPTION_EXPIRED',
        'مهلت پاسخ‌گویی به این درخواست به پایان رسیده است.',
        410,
      );
    }
    if (
      row.prescription.cancelledAt ||
      row.prescription.completedAt ||
      row.prescription.selectedPharmacyId ||
      ['CLOSED', 'EXPIRED'].includes(row.status)
    )
      throw conflict('PRESCRIPTION_CLOSED', 'این درخواست دیگر پاسخ جدید نمی‌پذیرد.');
    const existing = await this.prisma.pharmacyResponse.findUnique({
      where: { prescriptionId_pharmacyId: { prescriptionId: row.prescriptionId, pharmacyId } },
      select: { id: true },
    });
    await this.prisma.$transaction(async (transaction) => {
      const open = await transaction.prescription.updateMany({
        where: {
          id: row.prescriptionId,
          selectedPharmacyId: null,
          cancelledAt: null,
          completedAt: null,
          expiresAt: { gt: now },
        },
        data: { status: row.prescription.status },
      });
      if (open.count !== 1)
        throw conflict('PRESCRIPTION_CLOSED', 'این درخواست دیگر پاسخ جدید نمی‌پذیرد.');
      const assignment = await transaction.prescriptionPharmacyRequest.updateMany({
        where: { id: row.id, pharmacyId, status: { notIn: ['CLOSED', 'EXPIRED', 'SELECTED'] } },
        data: { status: 'RESPONDED', respondedAt: now },
      });
      if (assignment.count !== 1)
        throw conflict('PRESCRIPTION_CLOSED', 'این درخواست دیگر پاسخ جدید نمی‌پذیرد.');
      await transaction.pharmacyResponse.upsert({
        where: { prescriptionId_pharmacyId: { prescriptionId: row.prescriptionId, pharmacyId } },
        create: {
          prescriptionId: row.prescriptionId,
          pharmacyId,
          userId,
          availabilityStatus: parsed.data.availabilityStatus,
          description: parsed.data.description || null,
          respondedAt: now,
        },
        update: {
          userId,
          availabilityStatus: parsed.data.availabilityStatus,
          description: parsed.data.description || null,
          respondedAt: now,
        },
      });
    });
    await this.refreshAggregate(row.prescriptionId);
    await this.audit.record({
      actorUserId: userId,
      action: existing ? 'UPDATE_RESPONSE' : 'RESPOND_PRESCRIPTION',
      entityType: 'Prescription',
      entityId: row.prescriptionId,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { pharmacyId, availabilityStatus: parsed.data.availabilityStatus },
    });
    return { status: await this.getCurrentStatus(row.prescriptionId) };
  }

  async dashboard(pharmacyId: string): Promise<Record<string, number>> {
    const [newCount, underReview, accepted, partial, rejected, today, unreadNotifications] =
      await Promise.all([
        this.prisma.prescriptionPharmacyRequest.count({ where: { pharmacyId, status: 'SENT' } }),
        this.prisma.prescriptionPharmacyRequest.count({
          where: {
            pharmacyId,
            status: { in: ['VIEWED', 'RESPONDED'] },
            prescription: { status: 'UNDER_REVIEW' },
          },
        }),
        this.prisma.prescriptionPharmacyRequest.count({
          where: { pharmacyId, prescription: { status: 'ACCEPTED' } },
        }),
        this.prisma.prescriptionPharmacyRequest.count({
          where: { pharmacyId, prescription: { status: 'PARTIAL' } },
        }),
        this.prisma.prescriptionPharmacyRequest.count({
          where: { pharmacyId, prescription: { status: 'REJECTED' } },
        }),
        this.prisma.prescriptionPharmacyRequest.count({
          where: { pharmacyId, sentAt: { gte: startOfTehranDay(new Date()) } },
        }),
        this.prisma.notification.count({ where: { pharmacyId, readAt: null } }),
      ]);
    return { new: newCount, underReview, accepted, partial, rejected, today, unreadNotifications };
  }

  async notifications(
    pharmacyId: string,
  ): Promise<{ unread: number; items: Array<Record<string, unknown>> }> {
    const [unread, rows] = await this.prisma.$transaction([
      this.prisma.notification.count({ where: { pharmacyId, readAt: null } }),
      this.prisma.notification.findMany({
        where: { pharmacyId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);
    return {
      unread,
      items: rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        readAt: row.readAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async markNotificationRead(id: string, pharmacyId: string): Promise<{ read: true }> {
    await this.prisma.notification.updateMany({
      where: { id, pharmacyId },
      data: { readAt: new Date() },
    });
    return { read: true };
  }

  async adminList(query: PrescriptionListQueryDto): Promise<{
    items: Array<Record<string, unknown>>;
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const page = this.safePage(query.page);
    const limit = this.safeLimit(query.limit);
    const dateRange = this.parseDateRange(query.dateFrom, query.dateTo);
    const search = query.search?.trim();
    const where: Prisma.PrescriptionWhereInput = {
      ...(dateRange ? { createdAt: dateRange } : {}),
      ...(query.status &&
      [
        'PENDING',
        'UNDER_REVIEW',
        'ACCEPTED',
        'PARTIAL',
        'REJECTED',
        'SELECTED_PHARMACY',
        'EXPIRED',
        'COMPLETED',
        'CANCELLED',
      ].includes(query.status)
        ? { status: query.status as PrescriptionStatus }
        : {}),
      ...(query.pharmacyId ? { assignments: { some: { pharmacyId: query.pharmacyId } } } : {}),
      ...(query.insuranceId ? { baseInsuranceId: query.insuranceId } : {}),
      ...(search
        ? {
            OR: [
              { publicId: { contains: search, mode: 'insensitive' } },
              { prescriptionTrackingCode: { contains: search, mode: 'insensitive' } },
              { mobile: { contains: search } },
              { nationalId: { contains: search } },
            ],
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.prescription.count({ where }),
      this.prisma.prescription.findMany({
        where,
        orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          baseInsurance: true,
          supplementaryInsurance: true,
          assignments: { include: { pharmacy: true }, orderBy: { createdAt: 'asc' } },
          responses: { include: { pharmacy: true }, orderBy: { respondedAt: 'desc' } },
        },
      }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        publicId: row.publicId,
        status: row.status,
        mobile: maskMobile(row.mobile),
        nationalId: maskNationalId(row.nationalId),
        prescriptionTrackingCode: row.prescriptionTrackingCode,
        baseInsurance: row.baseInsurance.name,
        createdAt: row.createdAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
        responseCount: row.responses.length,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async adminDetail(id: string): Promise<Record<string, unknown>> {
    const row = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        baseInsurance: true,
        supplementaryInsurance: true,
        selectedPharmacy: true,
        assignments: { include: { pharmacy: true } },
        responses: { include: { pharmacy: true, user: { select: { username: true } } } },
      },
    });
    if (!row) throw new AppError('NOT_FOUND', 'درخواست موردنظر پیدا نشد.', 404);
    return {
      id: row.id,
      publicId: row.publicId,
      status: row.status,
      mobile: row.mobile,
      nationalId: row.nationalId,
      prescriptionTrackingCode: row.prescriptionTrackingCode,
      baseInsurance: row.baseInsurance.name,
      supplementaryInsurance: row.supplementaryInsurance?.name ?? null,
      hasSupplementaryInsurance: row.hasSupplementaryInsurance,
      supplementaryDescription: row.supplementaryDescription,
      patientDescription: row.patientDescription,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      selectedPharmacy: row.selectedPharmacy
        ? { id: row.selectedPharmacy.id, name: row.selectedPharmacy.name }
        : null,
      assignments: row.assignments.map((assignment) => ({
        id: assignment.id,
        pharmacyId: assignment.pharmacyId,
        pharmacyName: assignment.pharmacy.name,
        status: assignment.status,
        sentAt: assignment.sentAt.toISOString(),
        seenAt: assignment.seenAt?.toISOString() ?? null,
      })),
      responses: row.responses.map((response) => ({
        id: response.id,
        pharmacyId: response.pharmacyId,
        pharmacyName: response.pharmacy.name,
        availabilityStatus: response.availabilityStatus,
        description: response.description,
        respondedAt: response.respondedAt.toISOString(),
        respondedBy: response.user.username,
      })),
    };
  }

  async refreshAggregate(prescriptionId: string): Promise<PrescriptionStatus> {
    return this.prisma.$transaction(async (transaction) => {
      const locked = await transaction.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT "id" FROM "Prescription" WHERE "id" = ${prescriptionId} FOR UPDATE`,
      );
      if (!locked.length) throw new AppError('NOT_FOUND', 'درخواست موردنظر پیدا نشد.', 404);

      const row = await transaction.prescription.findUnique({
        where: { id: prescriptionId },
        include: { assignments: true, responses: { select: { availabilityStatus: true } } },
      });
      if (!row) throw new AppError('NOT_FOUND', 'درخواست موردنظر پیدا نشد.', 404);
      const nextStatus = aggregatePrescriptionStatus({
        cancelledAt: row.cancelledAt,
        completedAt: row.completedAt,
        selectedPharmacyId: row.selectedPharmacyId,
        expiresAt: row.expiresAt,
        assignmentCount: row.assignments.length,
        respondedCount: row.responses.length,
        hasViewedAssignment: row.assignments.some((assignment) => assignment.status === 'VIEWED'),
        hasNotAvailableResponse: row.responses.some(
          (response) => response.availabilityStatus === 'NOT_AVAILABLE',
        ),
        availabilityStatuses: row.responses.map((response) => response.availabilityStatus),
      });
      if (
        row.status !== nextStatus &&
        !row.selectedPharmacyId &&
        !row.cancelledAt &&
        !row.completedAt
      )
        await transaction.prescription.update({
          where: { id: prescriptionId },
          data: { status: nextStatus },
        });
      return nextStatus;
    });
  }

  private async getCurrentStatus(id: string): Promise<PrescriptionStatus> {
    const row = await this.prisma.prescription.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!row) throw new AppError('NOT_FOUND', 'درخواست موردنظر پیدا نشد.', 404);
    return row.status;
  }

  private async consumePublicMutationRateLimit(
    publicId: string,
    request: RequestWithContext,
  ): Promise<void> {
    if (!isValidPublicId(publicId)) throw publicNotFound();
    const allowed = await this.redis.consumeRateLimit(
      `pharmacy-mvp:prescription-mutation:${request.ip ?? 'unknown'}:${publicId}`,
      20,
      60,
    );
    if (!allowed) throw new AppError('RATE_LIMITED', 'تعداد درخواست‌ها بیش از حد مجاز است.', 429);
  }

  private async findByPublicToken(publicId: string, rawToken: string | undefined) {
    if (!isValidPublicId(publicId) || !rawToken || !ACCESS_TOKEN_PATTERN.test(rawToken))
      throw publicNotFound();
    const prescription = await this.prisma.prescription.findUnique({ where: { publicId } });
    if (!prescription) throw publicNotFound();
    if (!verifyOpaqueToken(rawToken, prescription.accessTokenHash)) throw publicNotFound();
    return prescription;
  }

  private async expireIfNeeded(
    id: string,
    expiresAt: Date,
    selectedPharmacyId: string | null,
    cancelledAt: Date | null,
    completedAt: Date | null,
  ): Promise<void> {
    if (expiresAt > new Date() || selectedPharmacyId || cancelledAt || completedAt) return;
    await this.prisma.$transaction([
      this.prisma.prescription.updateMany({
        where: { id, selectedPharmacyId: null, cancelledAt: null, completedAt: null },
        data: { status: 'EXPIRED' },
      }),
      this.prisma.prescriptionPharmacyRequest.updateMany({
        where: { prescriptionId: id, status: { in: ['SENT', 'VIEWED'] } },
        data: { status: 'EXPIRED', closedAt: new Date() },
      }),
    ]);
  }

  private async generatePublicId(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = randomBytes(6)
        .toString('base64url')
        .replace(/[^A-Z0-9]/gi, '')
        .slice(0, 8)
        .toUpperCase()
        .padEnd(8, 'X');
      const candidate = `RX-${suffix}`;
      const exists = await this.prisma.prescription.findUnique({
        where: { publicId: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    throw new AppError('ID_GENERATION_FAILED', 'امکان ایجاد کد پیگیری وجود ندارد.', 500);
  }

  private availabilityRank(status: AvailabilityStatus): number {
    return status === 'FULL_AVAILABLE' ? 0 : status === 'PARTIAL_AVAILABLE' ? 1 : 2;
  }

  private safePage(value: string | undefined): number {
    const page = Number(value ?? 1);
    return Number.isInteger(page) && page > 0 ? Math.min(page, 1_000_000) : 1;
  }

  private safeLimit(value: string | undefined): number {
    const limit = Number(value ?? 20);
    return Number.isInteger(limit) && limit > 0 ? Math.min(limit, MAX_PAGE_LIMIT) : 20;
  }

  private parseDateRange(
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

  private mapPharmacyRow(
    row: Prisma.PrescriptionPharmacyRequestGetPayload<{
      include: {
        prescription: {
          include: {
            baseInsurance: true;
            supplementaryInsurance: true;
            responses: { where: { pharmacyId: string } };
          };
        };
      };
    }>,
  ): Record<string, unknown> {
    return {
      id: row.id,
      publicId: row.prescription.publicId,
      status: row.status,
      prescriptionStatus: row.prescription.status,
      mobile: maskMobile(row.prescription.mobile),
      nationalId: maskNationalId(row.prescription.nationalId),
      prescriptionTrackingCode: row.prescription.prescriptionTrackingCode,
      baseInsurance: row.prescription.baseInsurance.name,
      supplementaryInsurance: row.prescription.supplementaryInsurance?.name ?? null,
      sentAt: row.sentAt.toISOString(),
      respondedAt: row.respondedAt?.toISOString() ?? null,
      response: row.prescription.responses[0]
        ? {
            availabilityStatus: row.prescription.responses[0].availabilityStatus,
            description: row.prescription.responses[0].description,
          }
        : null,
    };
  }

  private mapPharmacyDetail(
    row: Prisma.PrescriptionPharmacyRequestGetPayload<{
      include: {
        prescription: {
          include: {
            baseInsurance: true;
            supplementaryInsurance: true;
            responses: { where: { pharmacyId: string } };
            selectedPharmacy: true;
          };
        };
        pharmacy: true;
      };
    }>,
  ): Record<string, unknown> {
    return {
      id: row.id,
      publicId: row.prescription.publicId,
      sentAt: row.sentAt.toISOString(),
      seenAt: row.seenAt?.toISOString() ?? null,
      status: row.status,
      prescriptionStatus: row.prescription.status,
      mobile: row.prescription.mobile,
      nationalId: row.prescription.nationalId,
      prescriptionTrackingCode: row.prescription.prescriptionTrackingCode,
      baseInsurance: row.prescription.baseInsurance.name,
      supplementaryInsurance: row.prescription.supplementaryInsurance?.name ?? null,
      hasSupplementaryInsurance: row.prescription.hasSupplementaryInsurance,
      supplementaryDescription: row.prescription.supplementaryDescription,
      patientDescription: row.prescription.patientDescription,
      expiresAt: row.prescription.expiresAt.toISOString(),
      response: row.prescription.responses[0]
        ? {
            availabilityStatus: row.prescription.responses[0].availabilityStatus,
            description: row.prescription.responses[0].description,
            respondedAt: row.prescription.responses[0].respondedAt.toISOString(),
          }
        : null,
      selectedPharmacyId: row.prescription.selectedPharmacyId,
    };
  }
}
