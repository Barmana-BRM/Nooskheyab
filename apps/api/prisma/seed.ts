import { PrismaClient, InsuranceType, UserRole } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const baseInsurances = ['تأمین اجتماعی', 'بیمه سلامت', 'نیروهای مسلح', 'خدمات درمانی', 'سایر'];
const supplementaryInsurances = [
  'دانا',
  'دی',
  'آسیا',
  'ایران',
  'البرز',
  'سامان',
  'پارسیان',
  'ملت',
  'آتیه‌سازان',
  'سایر',
];

async function main(): Promise<void> {
  for (const [sortOrder, name] of baseInsurances.entries()) {
    await prisma.insuranceProvider.upsert({
      where: { name_type: { name, type: InsuranceType.BASE } },
      update: { isActive: true, sortOrder },
      create: { name, type: InsuranceType.BASE, sortOrder },
    });
  }
  for (const [sortOrder, name] of supplementaryInsurances.entries()) {
    await prisma.insuranceProvider.upsert({
      where: { name_type: { name, type: InsuranceType.SUPPLEMENTARY } },
      update: { isActive: true, sortOrder },
      create: { name, type: InsuranceType.SUPPLEMENTARY, sortOrder },
    });
  }

  const username = process.env.ADMIN_INITIAL_USERNAME?.trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  const mobile = process.env.ADMIN_INITIAL_MOBILE?.trim();
  if (username && password && mobile) {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await prisma.user.upsert({
      where: { username },
      update: { passwordHash, mobile, isActive: true, role: UserRole.SUPER_ADMIN },
      create: {
        firstName: 'مدیر',
        lastName: 'سامانه',
        username,
        mobile,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
      },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed', error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
