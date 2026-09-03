import { expect, test } from '@playwright/test';

test('patient request form exposes labels and conditional supplementary insurance', async ({
  page,
}) => {
  await page.goto('/request');
  await expect(page.getByRole('heading', { name: 'ثبت درخواست نسخه' })).toBeVisible();
  await expect(page.getByLabel('شماره موبایل')).toBeVisible();
  await page.getByRole('radio', { name: 'بیمه تکمیلی دارم' }).check({ force: true });
  await expect(page.getByLabel('شرکت بیمه تکمیلی')).toBeVisible();
  await page.getByRole('radio', { name: 'بیمه تکمیلی ندارم' }).check({ force: true });
  await expect(page.getByLabel('شرکت بیمه تکمیلی')).toHaveCount(0);
});
