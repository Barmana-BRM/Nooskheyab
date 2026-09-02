CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'PHARMACY_ADMIN', 'PHARMACY_USER');
CREATE TYPE "RegistrationStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'SUSPENDED');
CREATE TYPE "DocumentType" AS ENUM ('PHARMACY_LICENSE', 'TECHNICAL_MANAGER_CARD', 'OTHER');
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "PrescriptionStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'PARTIAL', 'REJECTED', 'SELECTED_PHARMACY', 'EXPIRED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PrescriptionRequestStatus" AS ENUM ('SENT', 'VIEWED', 'RESPONDED', 'SELECTED', 'CLOSED', 'EXPIRED');
CREATE TYPE "AvailabilityStatus" AS ENUM ('FULL_AVAILABLE', 'PARTIAL_AVAILABLE', 'NOT_AVAILABLE');
CREATE TYPE "InsuranceType" AS ENUM ('BASE', 'SUPPLEMENTARY');
CREATE TYPE "ReviewAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'SUSPENDED', 'REACTIVATED');
CREATE TYPE "NotificationType" AS ENUM ('NEW_PRESCRIPTION', 'PHARMACY_REVIEW', 'SYSTEM');

CREATE TABLE "Pharmacy" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "technicalManager" TEXT NOT NULL,
  "technicalManagerIdentifier" TEXT,
  "pharmacyIdentifier" TEXT,
  "licenseNumber" TEXT NOT NULL,
  "licenseExpirationDate" TIMESTAMP(3) NOT NULL,
  "mobile" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "province" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "workingHours" TEXT NOT NULL,
  "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'DRAFT',
  "reviewMessage" TEXT,
  "approvedBy" UUID,
  "approvedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Pharmacy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "email" TEXT,
  "mobile" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "pharmacyId" UUID,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PharmacyDocument" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pharmacyId" UUID NOT NULL,
  "documentType" "DocumentType" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "verificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "rejectionReason" TEXT,
  "uploadedBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PharmacyDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceProvider" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "type" "InsuranceType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InsuranceProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Prescription" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "publicId" TEXT NOT NULL,
  "accessTokenHash" TEXT NOT NULL,
  "mobile" TEXT NOT NULL,
  "nationalId" TEXT NOT NULL,
  "prescriptionTrackingCode" TEXT NOT NULL,
  "baseInsuranceId" UUID NOT NULL,
  "hasSupplementaryInsurance" BOOLEAN NOT NULL DEFAULT false,
  "supplementaryInsuranceId" UUID,
  "supplementaryDescription" TEXT,
  "patientDescription" TEXT,
  "status" "PrescriptionStatus" NOT NULL DEFAULT 'PENDING',
  "selectedPharmacyId" UUID,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrescriptionPharmacyRequest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "prescriptionId" UUID NOT NULL,
  "pharmacyId" UUID NOT NULL,
  "status" "PrescriptionRequestStatus" NOT NULL DEFAULT 'SENT',
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "seenAt" TIMESTAMP(3),
  "respondedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrescriptionPharmacyRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PharmacyResponse" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "prescriptionId" UUID NOT NULL,
  "pharmacyId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "availabilityStatus" "AvailabilityStatus" NOT NULL,
  "description" TEXT,
  "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PharmacyResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actorUserId" UUID,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" UUID,
  "requestId" TEXT NOT NULL,
  "ipAddress" TEXT NOT NULL,
  "userAgent" TEXT NOT NULL,
  "metadataJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefreshSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "refreshTokenHash" TEXT NOT NULL,
  "deviceId" TEXT,
  "platform" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID,
  "pharmacyId" UUID,
  "type" "NotificationType" NOT NULL,
  "entityId" UUID,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PharmacyReviewHistory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pharmacyId" UUID NOT NULL,
  "action" "ReviewAction" NOT NULL,
  "message" TEXT,
  "adminUserId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PharmacyReviewHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Pharmacy_pharmacyIdentifier_key" ON "Pharmacy"("pharmacyIdentifier");
CREATE UNIQUE INDEX "Pharmacy_licenseNumber_key" ON "Pharmacy"("licenseNumber");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");
CREATE UNIQUE INDEX "Prescription_publicId_key" ON "Prescription"("publicId");
CREATE UNIQUE INDEX "Prescription_accessTokenHash_key" ON "Prescription"("accessTokenHash");
CREATE UNIQUE INDEX "PrescriptionPharmacyRequest_prescriptionId_pharmacyId_key" ON "PrescriptionPharmacyRequest"("prescriptionId", "pharmacyId");
CREATE UNIQUE INDEX "PharmacyResponse_prescriptionId_pharmacyId_key" ON "PharmacyResponse"("prescriptionId", "pharmacyId");
CREATE UNIQUE INDEX "InsuranceProvider_name_type_key" ON "InsuranceProvider"("name", "type");
CREATE UNIQUE INDEX "RefreshSession_refreshTokenHash_key" ON "RefreshSession"("refreshTokenHash");

CREATE INDEX "Pharmacy_registrationStatus_isActive_idx" ON "Pharmacy"("registrationStatus", "isActive");
CREATE INDEX "Pharmacy_createdAt_idx" ON "Pharmacy"("createdAt");
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");
CREATE INDEX "User_pharmacyId_isActive_idx" ON "User"("pharmacyId", "isActive");
CREATE INDEX "PharmacyDocument_pharmacyId_documentType_idx" ON "PharmacyDocument"("pharmacyId", "documentType");
CREATE INDEX "PharmacyDocument_verificationStatus_idx" ON "PharmacyDocument"("verificationStatus");
CREATE INDEX "Prescription_prescriptionTrackingCode_idx" ON "Prescription"("prescriptionTrackingCode");
CREATE INDEX "Prescription_nationalId_idx" ON "Prescription"("nationalId");
CREATE INDEX "Prescription_mobile_idx" ON "Prescription"("mobile");
CREATE INDEX "Prescription_status_idx" ON "Prescription"("status");
CREATE INDEX "Prescription_createdAt_idx" ON "Prescription"("createdAt");
CREATE INDEX "Prescription_expiresAt_idx" ON "Prescription"("expiresAt");
CREATE INDEX "Prescription_selectedPharmacyId_idx" ON "Prescription"("selectedPharmacyId");
CREATE INDEX "PrescriptionPharmacyRequest_pharmacyId_status_sentAt_idx" ON "PrescriptionPharmacyRequest"("pharmacyId", "status", "sentAt");
CREATE INDEX "PrescriptionPharmacyRequest_prescriptionId_pharmacyId_idx" ON "PrescriptionPharmacyRequest"("prescriptionId", "pharmacyId");
CREATE INDEX "PharmacyResponse_prescriptionId_pharmacyId_idx" ON "PharmacyResponse"("prescriptionId", "pharmacyId");
CREATE INDEX "InsuranceProvider_type_isActive_sortOrder_idx" ON "InsuranceProvider"("type", "isActive", "sortOrder");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");
CREATE INDEX "RefreshSession_userId_revokedAt_expiresAt_idx" ON "RefreshSession"("userId", "revokedAt", "expiresAt");
CREATE INDEX "Notification_pharmacyId_readAt_createdAt_idx" ON "Notification"("pharmacyId", "readAt", "createdAt");
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
CREATE INDEX "PharmacyReviewHistory_pharmacyId_createdAt_idx" ON "PharmacyReviewHistory"("pharmacyId", "createdAt");

ALTER TABLE "User" ADD CONSTRAINT "User_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PharmacyDocument" ADD CONSTRAINT "PharmacyDocument_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyDocument" ADD CONSTRAINT "PharmacyDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_baseInsuranceId_fkey" FOREIGN KEY ("baseInsuranceId") REFERENCES "InsuranceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_supplementaryInsuranceId_fkey" FOREIGN KEY ("supplementaryInsuranceId") REFERENCES "InsuranceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_selectedPharmacyId_fkey" FOREIGN KEY ("selectedPharmacyId") REFERENCES "Pharmacy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrescriptionPharmacyRequest" ADD CONSTRAINT "PrescriptionPharmacyRequest_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrescriptionPharmacyRequest" ADD CONSTRAINT "PrescriptionPharmacyRequest_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyResponse" ADD CONSTRAINT "PharmacyResponse_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyResponse" ADD CONSTRAINT "PharmacyResponse_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyResponse" ADD CONSTRAINT "PharmacyResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyReviewHistory" ADD CONSTRAINT "PharmacyReviewHistory_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyReviewHistory" ADD CONSTRAINT "PharmacyReviewHistory_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
