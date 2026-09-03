import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { type DocumentType, type RegistrationStatus } from '@prisma/client';
import argon2 from 'argon2';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, unlink } from 'node:fs/promises';
import { extname } from 'node:path';
import type { AppEnvironment } from '@pharmacy-mvp/config';
import {
  isCommonPassword,
  mobileSchema,
  normalizeDigits,
  normalizeMobile,
  pharmacyRegistrationSchema,
} from '@pharmacy-mvp/validation';
import { AppError, conflict } from '../common/errors';
import { AuditService } from '../common/audit.service';
import { maskMobile } from '../common/masking';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';
import { StorageService } from '../common/storage.service';
import type { RequestWithContext } from '../common/request-context';
import type { RegisterPharmacyDto, ReviewMessageDto, UpdatePharmacyDto } from './pharmacy.dto';

@Injectable()
export class PharmacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService<AppEnvironment, true>,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
  ) {}

  async register(
    body: RegisterPharmacyDto,
    request: RequestWithContext,
  ): Promise<{ pharmacyId: string; status: 'DRAFT' }> {
    const registrationAllowed = await this.redis.consumeRateLimit(
      `pharmacy-mvp:pharmacy-register:${request.ip ?? 'unknown'}`,
      3,
      900,
    );
    if (!registrationAllowed)
      throw new AppError('RATE_LIMITED', 'تعداد تلاش‌های ثبت‌نام بیش از حد مجاز است.', 429);
    const parsed = pharmacyRegistrationSchema.safeParse({
      ...body,
      mobile: normalizeMobile(body.mobile),
    });
    if (!parsed.success || isCommonPassword(body.password))
      throw new AppError('VALIDATION_ERROR', 'اطلاعات ثبت‌نام معتبر نیست.', 422, {
        form: 'اطلاعات ثبت‌نام یا رمز عبور معتبر نیست.',
      });
    const passwordHash = await argon2.hash(body.password, { type: argon2.argon2id });
    const pharmacy = await this.prisma.$transaction(async (transaction) => {
      const createdPharmacy = await transaction.pharmacy.create({
        data: {
          name: parsed.data.pharmacyName,
          technicalManager: parsed.data.technicalManager,
          technicalManagerIdentifier: parsed.data.technicalManagerIdentifier || null,
          pharmacyIdentifier: parsed.data.pharmacyIdentifier || null,
          licenseNumber: parsed.data.licenseNumber,
          licenseExpirationDate: new Date(parsed.data.licenseExpirationDate),
          mobile: parsed.data.mobile,
          phone: parsed.data.phone,
          province: parsed.data.province,
          city: parsed.data.city,
          address: parsed.data.address,
          postalCode: parsed.data.postalCode,
          workingHours: parsed.data.workingHours,
        },
      });
      await transaction.user.create({
        data: {
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          username: parsed.data.username.toLowerCase(),
          mobile: parsed.data.mobile,
          passwordHash,
          role: 'PHARMACY_ADMIN',
          pharmacyId: createdPharmacy.id,
        },
      });
      return createdPharmacy;
    });
    await this.audit.record({
      action: 'REGISTER_PHARMACY',
      entityType: 'Pharmacy',
      entityId: pharmacy.id,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { pharmacyId: pharmacy.id },
    });
    return { pharmacyId: pharmacy.id, status: 'DRAFT' };
  }

  async status(pharmacyId: string): Promise<Record<string, unknown>> {
    const pharmacy = await this.prisma.pharmacy.findFirst({
      where: { id: pharmacyId, deletedAt: null },
      include: {
        documents: true,
        reviewHistory: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!pharmacy) throw new AppError('NOT_FOUND', 'اطلاعات داروخانه پیدا نشد.', 404);
    return this.mapRegistration(pharmacy);
  }

  async update(
    pharmacyId: string,
    userId: string,
    body: UpdatePharmacyDto,
    request: RequestWithContext,
  ): Promise<Record<string, unknown>> {
    const current = await this.prisma.pharmacy.findFirst({
      where: { id: pharmacyId, deletedAt: null },
    });
    if (!current) throw new AppError('NOT_FOUND', 'اطلاعات داروخانه پیدا نشد.', 404);
    if (current.registrationStatus === 'PENDING_APPROVAL')
      throw conflict('REGISTRATION_LOCKED', 'درخواست در حال بررسی است و فعلاً قابل ویرایش نیست.');
    const normalizedMobile =
      body.mobile === undefined ? undefined : mobileSchema.safeParse(normalizeMobile(body.mobile));
    if (normalizedMobile && !normalizedMobile.success)
      throw new AppError('VALIDATION_ERROR', 'شماره موبایل معتبر نیست.', 422, {
        mobile: 'شماره موبایل معتبر نیست.',
      });
    const normalizedPostalCode =
      body.postalCode === undefined ? undefined : normalizeDigits(body.postalCode).trim();
    if (normalizedPostalCode !== undefined && !/^\d{10}$/.test(normalizedPostalCode))
      throw new AppError('VALIDATION_ERROR', 'کد پستی معتبر نیست.', 422, {
        postalCode: 'کد پستی باید ۱۰ رقم باشد.',
      });
    if (
      body.licenseExpirationDate !== undefined &&
      Number.isNaN(new Date(body.licenseExpirationDate).getTime())
    )
      throw new AppError('VALIDATION_ERROR', 'تاریخ اعتبار مجوز معتبر نیست.', 422, {
        licenseExpirationDate: 'تاریخ اعتبار مجوز معتبر نیست.',
      });
    const normalizedTechnicalManagerIdentifier =
      body.technicalManagerIdentifier === undefined
        ? undefined
        : body.technicalManagerIdentifier.trim() || null;
    const normalizedPharmacyIdentifier =
      body.pharmacyIdentifier === undefined ? undefined : body.pharmacyIdentifier.trim() || null;
    const normalizedLicenseNumber =
      body.licenseNumber === undefined ? undefined : body.licenseNumber.trim();
    const sensitiveChanged =
      current.registrationStatus === 'APPROVED' &&
      ((body.pharmacyName !== undefined && body.pharmacyName.trim() !== current.name) ||
        (body.technicalManager !== undefined &&
          body.technicalManager.trim() !== current.technicalManager) ||
        (normalizedTechnicalManagerIdentifier !== undefined &&
          normalizedTechnicalManagerIdentifier !== current.technicalManagerIdentifier) ||
        (normalizedPharmacyIdentifier !== undefined &&
          normalizedPharmacyIdentifier !== current.pharmacyIdentifier) ||
        (normalizedLicenseNumber !== undefined &&
          normalizedLicenseNumber !== current.licenseNumber) ||
        (body.licenseExpirationDate !== undefined &&
          new Date(body.licenseExpirationDate).getTime() !==
            current.licenseExpirationDate.getTime()) ||
        (body.province !== undefined && body.province.trim() !== current.province) ||
        (body.city !== undefined && body.city.trim() !== current.city) ||
        (body.address !== undefined && body.address.trim() !== current.address) ||
        (normalizedPostalCode !== undefined && normalizedPostalCode !== current.postalCode));
    const data: Prisma.PharmacyUpdateInput = {
      ...(body.pharmacyName !== undefined ? { name: body.pharmacyName.trim() } : {}),
      ...(body.technicalManager !== undefined
        ? { technicalManager: body.technicalManager.trim() }
        : {}),
      ...(body.technicalManagerIdentifier !== undefined
        ? { technicalManagerIdentifier: normalizedTechnicalManagerIdentifier }
        : {}),
      ...(body.pharmacyIdentifier !== undefined
        ? { pharmacyIdentifier: normalizedPharmacyIdentifier }
        : {}),
      ...(body.licenseNumber !== undefined ? { licenseNumber: normalizedLicenseNumber } : {}),
      ...(body.licenseExpirationDate !== undefined
        ? { licenseExpirationDate: new Date(body.licenseExpirationDate) }
        : {}),
      ...(normalizedMobile?.success ? { mobile: normalizedMobile.data } : {}),
      ...(body.phone !== undefined ? { phone: body.phone.trim() } : {}),
      ...(body.province !== undefined ? { province: body.province.trim() } : {}),
      ...(body.city !== undefined ? { city: body.city.trim() } : {}),
      ...(body.address !== undefined ? { address: body.address.trim() } : {}),
      ...(normalizedPostalCode !== undefined ? { postalCode: normalizedPostalCode } : {}),
      ...(body.workingHours !== undefined ? { workingHours: body.workingHours.trim() } : {}),
      ...(sensitiveChanged
        ? {
            registrationStatus: 'CHANGES_REQUESTED',
            isActive: false,
            reviewMessage: 'اطلاعات کلیدی تغییر کرده و نیازمند بررسی مجدد است.',
            approvedBy: null,
            approvedAt: null,
          }
        : {}),
      ...(body.firstName !== undefined || body.lastName !== undefined
        ? {
            users: {
              update: {
                where: { id: userId },
                data: {
                  ...(body.firstName !== undefined ? { firstName: body.firstName.trim() } : {}),
                  ...(body.lastName !== undefined ? { lastName: body.lastName.trim() } : {}),
                },
              },
            },
          }
        : {}),
    };
    const updated = await this.prisma.pharmacy.update({ where: { id: pharmacyId }, data });
    await this.audit.record({
      actorUserId: userId,
      action: 'UPDATE_PHARMACY',
      entityType: 'Pharmacy',
      entityId: pharmacyId,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { pharmacyId, reviewRequired: sensitiveChanged },
    });
    return this.status(updated.id);
  }

  async submit(
    pharmacyId: string,
    userId: string,
    request: RequestWithContext,
  ): Promise<{ status: 'PENDING_APPROVAL' }> {
    const pharmacy = await this.prisma.pharmacy.findFirst({
      where: { id: pharmacyId, deletedAt: null },
      include: { documents: true },
    });
    if (!pharmacy) throw new AppError('NOT_FOUND', 'اطلاعات داروخانه پیدا نشد.', 404);
    if (!['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(pharmacy.registrationStatus))
      throw conflict('INVALID_REGISTRATION_TRANSITION', 'این ثبت‌نام در وضعیت قابل ارسال نیست.');
    const required = [
      'name',
      'technicalManager',
      'licenseNumber',
      'phone',
      'province',
      'city',
      'address',
      'postalCode',
      'workingHours',
    ] as const;
    const missing = required.filter((field) => !String(pharmacy[field]).trim());
    const hasLicense = pharmacy.documents.some(
      (document) =>
        document.documentType === 'PHARMACY_LICENSE' && document.verificationStatus !== 'REJECTED',
    );
    const requiresManagerCard = this.config.get('PHARMACY_DOCUMENT_TECHNICAL_MANAGER_REQUIRED');
    const hasManagerCard = pharmacy.documents.some(
      (document) =>
        document.documentType === 'TECHNICAL_MANAGER_CARD' &&
        document.verificationStatus !== 'REJECTED',
    );
    if (
      missing.length ||
      !hasLicense ||
      (requiresManagerCard && !hasManagerCard) ||
      pharmacy.licenseExpirationDate <= new Date()
    )
      throw new AppError('REGISTRATION_INCOMPLETE', 'اطلاعات و مدارک اجباری را کامل کنید.', 422, {
        documents: 'مجوز معتبر داروخانه اجباری است.',
      });
    await this.prisma.$transaction([
      this.prisma.pharmacy.update({
        where: { id: pharmacyId },
        data: { registrationStatus: 'PENDING_APPROVAL', reviewMessage: null },
      }),
      this.prisma.pharmacyReviewHistory.create({
        data: {
          pharmacyId,
          action: 'SUBMITTED',
          adminUserId: userId,
          message: 'ارسال توسط داروخانه',
        },
      }),
    ]);
    await this.audit.record({
      actorUserId: userId,
      action: 'SUBMIT_PHARMACY_REGISTRATION',
      entityType: 'Pharmacy',
      entityId: pharmacyId,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { pharmacyId },
    });
    return { status: 'PENDING_APPROVAL' };
  }

  async uploadDocument(
    pharmacyId: string,
    userId: string,
    file: Express.Multer.File | undefined,
    documentType: DocumentType,
    request: RequestWithContext,
  ): Promise<Record<string, unknown>> {
    if (!file) throw new BadRequestException('فایل مدرک ارسال نشده است.');
    try {
      const uploadAllowed = await this.redis.consumeRateLimit(
        `pharmacy-mvp:document-upload:${pharmacyId}:${request.ip ?? 'unknown'}`,
        20,
        900,
      );
      if (!uploadAllowed)
        throw new AppError('RATE_LIMITED', 'تعداد بارگذاری فایل بیش از حد مجاز است.', 429);
      const maxBytes = this.config.get('UPLOAD_MAX_BYTES');
      if (file.size > maxBytes)
        throw new AppError('FILE_TOO_LARGE', 'حجم فایل بیش از حد مجاز است.', 413);
      const pharmacy = await this.prisma.pharmacy.findFirst({
        where: { id: pharmacyId, deletedAt: null },
        select: { registrationStatus: true },
      });
      if (
        !pharmacy ||
        !['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(pharmacy.registrationStatus)
      )
        throw conflict('DOCUMENT_UPLOAD_LOCKED', 'مدارک در این وضعیت قابل تغییر نیستند.');
      const documentId = randomUUID();
      const storageKey = this.storage.buildObjectKey(pharmacyId, documentId);
      const safeOriginalName =
        file.originalname
          .split(/[\\/]/)
          .pop()
          ?.split('')
          .map((character) => {
            const code = character.charCodeAt(0);
            return code <= 31 || code === 127 ? '_' : character;
          })
          .join('')
          .slice(0, 180) || 'document';
      try {
        const magicBytes = await this.readMagicBytes(file.path);
        const detected = this.detectMime(magicBytes);
        const extension = extname(safeOriginalName).toLowerCase();
        const extensionMatches =
          (detected === 'image/jpeg' && ['.jpg', '.jpeg'].includes(extension)) ||
          (detected === 'image/png' && extension === '.png') ||
          (detected === 'application/pdf' && extension === '.pdf');
        if (
          !detected ||
          detected !== file.mimetype ||
          !['image/jpeg', 'image/png', 'application/pdf'].includes(detected) ||
          !extensionMatches
        )
          throw new AppError('INVALID_FILE', 'فرمت فایل مجاز نیست.', 422);
        const sha256 = await this.sha256File(file.path);
        await this.storage.upload(storageKey, {
          stream: createReadStream(file.path),
          mimeType: detected,
          fileSize: file.size,
          sha256,
        });
        const document = await this.prisma.pharmacyDocument.create({
          data: {
            id: documentId,
            pharmacyId,
            documentType,
            storageKey,
            originalName: safeOriginalName,
            mimeType: detected,
            fileSize: file.size,
            sha256,
            uploadedBy: userId,
          },
        });
        await this.audit.record({
          actorUserId: userId,
          action: 'UPLOAD_DOCUMENT',
          entityType: 'PharmacyDocument',
          entityId: document.id,
          requestId: request.requestId,
          ipAddress: request.ip ?? 'unknown',
          userAgent: request.get('user-agent') ?? '',
          metadata: { pharmacyId, documentType },
        });
        return {
          id: document.id,
          documentType: document.documentType,
          originalName: document.originalName,
          fileSize: document.fileSize,
          verificationStatus: document.verificationStatus,
        };
      } catch (error) {
        await this.prisma.pharmacyDocument
          .delete({ where: { id: documentId } })
          .catch(() => undefined);
        await this.storage.delete(storageKey).catch(() => undefined);
        throw error;
      }
    } finally {
      await unlink(file.path).catch(() => undefined);
    }
  }

  async deleteDocument(
    pharmacyId: string,
    documentId: string,
    userId: string,
    request: RequestWithContext,
  ): Promise<{ deleted: true }> {
    const document = await this.prisma.pharmacyDocument.findFirst({
      where: { id: documentId, pharmacyId },
      include: { pharmacy: true },
    });
    if (!document) throw new AppError('NOT_FOUND', 'مدرک پیدا نشد.', 404);
    if (!['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(document.pharmacy.registrationStatus))
      throw conflict('DOCUMENT_DELETE_LOCKED', 'مدرک در این وضعیت قابل حذف نیست.');
    await this.prisma.pharmacyDocument.delete({ where: { id: documentId } });
    await this.storage.delete(document.storageKey).catch(() => undefined);
    await this.audit.record({
      actorUserId: userId,
      action: 'DELETE_DOCUMENT',
      entityType: 'PharmacyDocument',
      entityId: documentId,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { pharmacyId },
    });
    return { deleted: true };
  }

  async signedDocumentUrl(
    pharmacyId: string,
    documentId: string,
  ): Promise<{ url: string; expiresIn: number }> {
    const document = await this.prisma.pharmacyDocument.findFirst({
      where: { id: documentId, pharmacyId },
      select: { storageKey: true },
    });
    if (!document) throw new AppError('NOT_FOUND', 'مدرک پیدا نشد.', 404);
    return {
      url: await this.storage.createSignedReadUrl(document.storageKey),
      expiresIn: this.config.get('S3_SIGNED_URL_TTL_SECONDS'),
    };
  }

  async adminSignedDocumentUrl(
    pharmacyId: string,
    documentId: string,
  ): Promise<{ url: string; expiresIn: number }> {
    const document = await this.prisma.pharmacyDocument.findFirst({
      where: { id: documentId, pharmacyId },
      select: { storageKey: true },
    });
    if (!document) throw new AppError('NOT_FOUND', 'مدرک پیدا نشد.', 404);
    return {
      url: await this.storage.createSignedReadUrl(document.storageKey),
      expiresIn: this.config.get('S3_SIGNED_URL_TTL_SECONDS'),
    };
  }

  async adminRegistrations(status?: string): Promise<Array<Record<string, unknown>>> {
    const allowed = [
      'DRAFT',
      'PENDING_APPROVAL',
      'APPROVED',
      'REJECTED',
      'CHANGES_REQUESTED',
      'SUSPENDED',
    ];
    const rows = await this.prisma.pharmacy.findMany({
      where: {
        deletedAt: null,
        ...(status && allowed.includes(status)
          ? { registrationStatus: status as RegistrationStatus }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { documents: true, reviewHistory: true },
    });
    return rows.map((row) => this.mapRegistration(row, true));
  }

  async adminReview(
    pharmacyId: string,
    adminUserId: string,
    action: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
    body: ReviewMessageDto | undefined,
    request: RequestWithContext,
  ): Promise<{ status: RegistrationStatus }> {
    const pharmacy = await this.prisma.pharmacy.findFirst({
      where: { id: pharmacyId, deletedAt: null },
      include: { documents: true },
    });
    if (!pharmacy) throw new AppError('NOT_FOUND', 'داروخانه پیدا نشد.', 404);
    if (pharmacy.registrationStatus !== 'PENDING_APPROVAL')
      throw conflict('INVALID_REVIEW_TRANSITION', 'این ثبت‌نام در انتظار بررسی نیست.');
    if (action !== 'APPROVED' && !body?.message?.trim())
      throw new AppError('VALIDATION_ERROR', 'ثبت دلیل برای این تصمیم الزامی است.', 422, {
        message: 'دلیل را وارد کنید.',
      });
    if (
      action === 'APPROVED' &&
      (pharmacy.licenseExpirationDate <= new Date() ||
        !pharmacy.documents.some(
          (document) =>
            document.documentType === 'PHARMACY_LICENSE' &&
            document.verificationStatus !== 'REJECTED',
        ))
    )
      throw new AppError('REGISTRATION_INCOMPLETE', 'مدرک مجوز معتبر نیست.', 422);
    const nextStatus: RegistrationStatus =
      action === 'APPROVED' ? 'APPROVED' : action === 'REJECTED' ? 'REJECTED' : 'CHANGES_REQUESTED';
    await this.prisma.$transaction([
      this.prisma.pharmacy.update({
        where: { id: pharmacyId },
        data: {
          registrationStatus: nextStatus,
          isActive: action === 'APPROVED',
          reviewMessage: body?.message?.trim() || null,
          approvedBy: action === 'APPROVED' ? adminUserId : null,
          approvedAt: action === 'APPROVED' ? new Date() : null,
        },
      }),
      ...(action === 'APPROVED'
        ? [
            this.prisma.pharmacyDocument.updateMany({
              where: { pharmacyId, verificationStatus: 'PENDING' },
              data: { verificationStatus: 'APPROVED' },
            }),
          ]
        : []),
      this.prisma.pharmacyReviewHistory.create({
        data: { pharmacyId, action, adminUserId, message: body?.message?.trim() || null },
      }),
    ]);
    await this.audit.record({
      actorUserId: adminUserId,
      action:
        action === 'APPROVED'
          ? 'APPROVE_PHARMACY'
          : action === 'REJECTED'
            ? 'REJECT_PHARMACY'
            : 'REQUEST_PHARMACY_CHANGES',
      entityType: 'Pharmacy',
      entityId: pharmacyId,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { pharmacyId, decision: action },
    });
    return { status: nextStatus };
  }

  async adminSuspend(
    pharmacyId: string,
    adminUserId: string,
    action: 'SUSPENDED' | 'REACTIVATED',
    request: RequestWithContext,
  ): Promise<{ status: RegistrationStatus }> {
    const pharmacy = await this.prisma.pharmacy.findFirst({
      where: { id: pharmacyId, deletedAt: null },
    });
    if (!pharmacy) throw new AppError('NOT_FOUND', 'داروخانه پیدا نشد.', 404);
    if (action === 'REACTIVATED' && pharmacy.registrationStatus !== 'SUSPENDED')
      throw conflict('INVALID_PHARMACY_TRANSITION', 'داروخانه معلق نیست.');
    if (action === 'REACTIVATED' && pharmacy.licenseExpirationDate <= new Date())
      throw new AppError('REGISTRATION_INCOMPLETE', 'مجوز داروخانه منقضی شده است.', 422);
    if (action === 'SUSPENDED' && pharmacy.registrationStatus !== 'APPROVED')
      throw conflict('INVALID_PHARMACY_TRANSITION', 'فقط داروخانه تأییدشده قابل تعلیق است.');
    const status: RegistrationStatus = action === 'SUSPENDED' ? 'SUSPENDED' : 'APPROVED';
    await this.prisma.$transaction([
      this.prisma.pharmacy.update({
        where: { id: pharmacyId },
        data: { registrationStatus: status, isActive: action === 'REACTIVATED' },
      }),
      this.prisma.pharmacyReviewHistory.create({ data: { pharmacyId, action, adminUserId } }),
    ]);
    await this.audit.record({
      actorUserId: adminUserId,
      action: action === 'SUSPENDED' ? 'SUSPEND_PHARMACY' : 'REACTIVATE_PHARMACY',
      entityType: 'Pharmacy',
      entityId: pharmacyId,
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
      metadata: { pharmacyId },
    });
    return { status };
  }

  private detectMime(buffer: Buffer): string | null {
    if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
      return 'image/png';
    if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
    return null;
  }

  private async readMagicBytes(path: string): Promise<Buffer> {
    const handle = await open(path, 'r');
    try {
      const header = Buffer.alloc(8);
      const { bytesRead } = await handle.read(header, 0, header.length, 0);
      return header.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }

  private async sha256File(path: string): Promise<string> {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    return hash.digest('hex');
  }

  private mapRegistration(
    pharmacy: Prisma.PharmacyGetPayload<{ include: { documents: true; reviewHistory: true } }>,
    maskSensitiveValues = false,
  ): Record<string, unknown> {
    return {
      id: pharmacy.id,
      name: pharmacy.name,
      technicalManager: pharmacy.technicalManager,
      technicalManagerIdentifier: pharmacy.technicalManagerIdentifier,
      pharmacyIdentifier: pharmacy.pharmacyIdentifier,
      licenseNumber: pharmacy.licenseNumber,
      licenseExpirationDate: pharmacy.licenseExpirationDate.toISOString(),
      mobile: maskSensitiveValues ? maskMobile(pharmacy.mobile) : pharmacy.mobile,
      phone: pharmacy.phone,
      province: pharmacy.province,
      city: pharmacy.city,
      address: pharmacy.address,
      postalCode: pharmacy.postalCode,
      workingHours: pharmacy.workingHours,
      registrationStatus: pharmacy.registrationStatus,
      reviewMessage: pharmacy.reviewMessage,
      isActive: pharmacy.isActive,
      documents: pharmacy.documents.map((document) => ({
        id: document.id,
        documentType: document.documentType,
        originalName: document.originalName,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        verificationStatus: document.verificationStatus,
        rejectionReason: document.rejectionReason,
        createdAt: document.createdAt.toISOString(),
      })),
      reviewHistory: pharmacy.reviewHistory.map((item) => ({
        action: item.action,
        message: item.message,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }
}
