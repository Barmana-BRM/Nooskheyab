ALTER TABLE "User"
  ADD CONSTRAINT "User_role_pharmacy_consistency_check"
  CHECK (
    ("role" IN ('PHARMACY_ADMIN', 'PHARMACY_USER') AND "pharmacyId" IS NOT NULL)
    OR
    ("role" IN ('ADMIN', 'SUPER_ADMIN') AND "pharmacyId" IS NULL)
  );

ALTER TABLE "Prescription"
  ADD CONSTRAINT "Prescription_supplementary_insurance_consistency_check"
  CHECK (
    ("hasSupplementaryInsurance" = true AND "supplementaryInsuranceId" IS NOT NULL)
    OR
    ("hasSupplementaryInsurance" = false AND "supplementaryInsuranceId" IS NULL AND "supplementaryDescription" IS NULL)
  );

DROP INDEX "Pharmacy_pharmacyIdentifier_key";
DROP INDEX "Pharmacy_licenseNumber_key";

CREATE UNIQUE INDEX "Pharmacy_pharmacyIdentifier_active_key"
  ON "Pharmacy" ("pharmacyIdentifier")
  WHERE "deletedAt" IS NULL AND "pharmacyIdentifier" IS NOT NULL;

CREATE UNIQUE INDEX "Pharmacy_licenseNumber_active_key"
  ON "Pharmacy" ("licenseNumber")
  WHERE "deletedAt" IS NULL;

UPDATE "User" SET "username" = LOWER("username");

CREATE UNIQUE INDEX "User_username_case_insensitive_key"
  ON "User" (LOWER("username"));

DROP INDEX "PrescriptionPharmacyRequest_prescriptionId_pharmacyId_idx";
DROP INDEX "PharmacyResponse_prescriptionId_pharmacyId_idx";
