# گزارش پیاده‌سازی MVP

## وضعیت

MVP متصل سامانه درخواست و پذیرش نسخه پیاده‌سازی شد: بیمار بدون حساب درخواست می‌سازد، داروخانه‌های تأییدشده درخواست را می‌بینند و پاسخ می‌دهند، و بیمار یک پاسخ معتبر را به‌صورت تراکنشی انتخاب می‌کند. پنل ثبت‌نام و بررسی داروخانه، پنل داروخانه، پنل مدیریت، PostgreSQL/Prisma، Redis، MinIO/S3 خصوصی، Audit، PWA و Wrapperهای Capacitor نیز در Repository قرار دارند.

## اجزای اصلی

- Monorepo با npm workspaces، TypeScript strict، packageهای shared برای types، validation، config، API client و UI.
- API نسخه‌دار NestJS در `/api/v1` با DTO validation، envelope پاسخ، request ID، Swagger، Health، RBAC، Tenant Isolation، Refresh Rotation و Argon2id.
- Schema و Migrationهای Prisma شامل Migration اولیه `20260902000000_init` و Migration قیود integrity با نام `20260902010000_integrity_constraints`.
- Fan-out واقعی Prescription به Pharmacyهای `APPROVED` و فعال، Token بیمار با hash، Idempotency در Redis، Aggregation وضعیت، Expiration، انتخاب شرطی و Audit.
- Upload مدارک با فایل موقت محدود، Magic Bytes، MIME، SHA-256، Object Key تصادفی، Bucket خصوصی، Stream به S3 و Signed URL کوتاه‌عمر. در Production، `S3_PUBLIC_ENDPOINT` روی Host جداگانه امضا می‌کند و Nginx بدون تغییر مسیر امضاشده آن را به MinIO خصوصی Proxy می‌کند.
- رابط فارسی RTL و Mobile First با رنگ‌ها و فونت محلی Vazirmatn، Loading/Empty/Error/Offline state، PWA shell cache، Safe Area، Back Button و Secure Storage Adapter.
- صفحات عمومی بیمار، ثبت‌نام و عملیات داروخانه و routeهای Admin برای Dashboard، Prescription، Registration، Pharmacy، User، Insurance و Audit Log.

## Commandهای اجراشده و نتیجه واقعی

جزئیات کامل در [TEST_REPORT.md](TEST_REPORT.md) ثبت شده است. `format:check`، `lint`، `typecheck`، `test:unit`، `build`، browser E2E، Prisma validation، Compose config، Capacitor sync و `npm audit --omit=dev` موفق شدند. تست Integration به علت در دسترس نبودن PostgreSQL و Redis اجراشدنی نبود؛ Docker daemon با خطای permission روی socket متوقف شد.

## مسیر اجرای Development

```bash
cp .env.example .env
npm ci
docker compose up -d postgres redis minio minio-init
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

وب روی `http://localhost:5173` و API روی `http://localhost:4000` قرار می‌گیرد. Seed فقط بیمه‌ها و در صورت تکمیل ENV، Admin اولیه را ایجاد می‌کند و هیچ بیمار آزمایشی نمی‌سازد.

## Build و استقرار

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run cap:sync
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

TLS، Secret Manager، Backup خارج از Volume، DNS/Proxy عمومی برای Signed URL، Monitoring و Signing Release باید در محیط استقرار واقعی تکمیل شوند. راهنمای Compose، Nginx، Backup/Restore و Native در [deployment.md](deployment.md) قرار دارد.

## محدودیت‌های واقعی

Docker socket این محیط اجازه اجرای PostgreSQL/Redis/MinIO را نداد، پس Integration کامل و Smoke سرویس‌های واقعی قابل تأیید نیست. CocoaPods نصب نبود و Build نهایی iOS انجام نشد؛ Android/iOS پروژه و Sync آماده‌اند اما Build/Signing Native ادعا نمی‌شود. هیچ اتصال واقعی به بیمه، سامانه نسخه الکترونیک، SMS، پرداخت، OCR، AI یا پیک اضافه نشده است.
