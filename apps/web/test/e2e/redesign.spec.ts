import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const publicRoutes = [
  '/',
  '/request',
  '/request/track',
  '/pharmacy/login',
  '/pharmacy/register',
  '/admin/login',
];

test('project identity is consistently Nooskheyab across the page and install manifest', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveTitle('نسخه‌یاب | سامانه نسخه دارویی');
  await expect(page.getByRole('link', { name: 'نسخه‌یاب، صفحه اصلی', exact: true })).toHaveCount(2);
  await expect(page.getByText('نسخه‌یار', { exact: false })).toHaveCount(0);
  const manifest = await page.request.get('/manifest.webmanifest');
  expect(await manifest.json()).toMatchObject({
    name: 'نسخه‌یاب | سامانه نسخه دارویی',
    short_name: 'نسخه‌یاب',
    lang: 'fa',
    dir: 'rtl',
  });
});

test('primary patient action navigates to the connected request form', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('قبل از مراجعه');
  await page
    .locator('.hero-actions')
    .getByRole('link', { name: 'ثبت درخواست نسخه', exact: true })
    .click();
  await expect(page).toHaveURL(/\/request$/);
  await expect(page.getByLabel('شماره موبایل', { exact: true })).toBeVisible();
  await expect(page.locator('a button, button a')).toHaveCount(0);
});

test('navigation supports mobile focus trapping and useful section links', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'باز کردن منو', exact: true });
  if (await toggle.isVisible()) {
    await toggle.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'بستن پنجره' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('link', { name: 'ثبت درخواست نسخه', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(toggle).toBeFocused();
    await toggle.click();
    await page.getByRole('dialog').getByRole('link', { name: 'چطور کار می‌کند؟' }).click();
  } else {
    await page
      .getByRole('navigation', { name: 'ناوبری اصلی', exact: true })
      .getByRole('link', { name: 'چطور کار می‌کند؟' })
      .click();
  }
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect
    .poll(() =>
      page
        .locator('#how-it-works')
        .evaluate((element) => Math.abs(element.getBoundingClientRect().top) < 150),
    )
    .toBe(true);
});

test('registration validates each step and preserves account fields when going back', async ({
  page,
}) => {
  await page.goto('/pharmacy/register');
  await page.getByRole('button', { name: 'ادامه', exact: true }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await page.getByLabel('نام', { exact: true }).fill('مسئول');
  await page.getByLabel('نام خانوادگی', { exact: true }).fill('داروخانه');
  await page.getByLabel('شماره موبایل', { exact: true }).fill('۰۹۱۲۳۴۵۶۷۸۹');
  await page.getByLabel('نام کاربری', { exact: true }).fill('review_pharmacy');
  await page.getByLabel('رمز عبور', { exact: true }).fill('UI-review-password-427');
  await page.getByRole('button', { name: 'ادامه', exact: true }).click();
  await expect(page.getByLabel('نام داروخانه', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'مرحله قبل' }).click();
  await expect(page.getByLabel('نام کاربری', { exact: true })).toHaveValue('review_pharmacy');
  await expect(page.getByLabel('شماره موبایل', { exact: true })).toHaveValue('۰۹۱۲۳۴۵۶۷۸۹');
});

test('tracking rejects incomplete links without sending sensitive input', async ({ page }) => {
  await page.goto('/request/track');
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/prescriptions/')) requests.push(request.url());
  });
  await page.getByLabel('لینک پیگیری خصوصی', { exact: true }).fill('https://example.com/unrelated');
  await page.getByRole('button', { name: 'مشاهده وضعیت درخواست' }).click();
  await expect(page.getByRole('alert')).toContainText('لینک');
  expect(requests).toEqual([]);
  await expect(page).toHaveURL(/\/request\/track$/);
});

test('public pages meet automated WCAG AA checks', async ({ page }) => {
  for (const route of publicRoutes) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const report = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(report.violations, route).toEqual([]);
  }
});

test('public layouts fit all required viewport widths', async ({ page }) => {
  test.setTimeout(90_000);
  for (const width of [320, 360, 390, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      '/',
      '/request',
      '/pharmacy/register',
      '/pharmacy/login',
      '/request/track',
    ]) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, route + ' at ' + width).toBeLessThanOrEqual(1);
    }
  }
});
