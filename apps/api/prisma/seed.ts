import { PrismaClient, InsuranceType, UserRole } from '@prisma/client';
import argon2 from 'argon2';
import { isCommonPassword, mobileSchema } from '@pharmacy-mvp/validation';

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
    const parsedMobile = mobileSchema.safeParse(mobile);
    if (username.length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(username))
      throw new Error('ADMIN_INITIAL_USERNAME is invalid');
    if (password.length < 10 || password.length > 128 || isCommonPassword(password))
      throw new Error('ADMIN_INITIAL_PASSWORD is invalid');
    if (!parsedMobile.success) throw new Error('ADMIN_INITIAL_MOBILE is invalid');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await prisma.user.upsert({
      where: { username },
      update: {
        passwordHash,
        mobile: parsedMobile.data,
        isActive: true,
        role: UserRole.SUPER_ADMIN,
        pharmacyId: null,
        deletedAt: null,
      },
      create: {
        firstName: 'مدیر',
        lastName: 'سامانه',
        username,
        mobile: parsedMobile.data,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
      },
    });
  }
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `Seed failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
