import { expect, test } from '@playwright/test';

test('patient request form exposes labels and conditional supplementary insurance', async ({
  page,
}) => {
  await page.goto('/request');
  await expect(page.getByRole('heading', { name: 'ثبت درخواست نسخه' })).toBeVisible();
  await expect(page.getByLabel('شماره موبایل')).toBeVisible();
  await page.getByText('بیمه تکمیلی دارم').click();
  await expect(page.getByLabel('شرکت بیمه تکمیلی')).toBeVisible();
  await page.getByText('بیمه تکمیلی ندارم').click();
  await expect(page.getByLabel('شرکت بیمه تکمیلی')).toHaveCount(0);
});
