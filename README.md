# نسخه‌یاب | سامانه نسخه دارویی

MVP فارسی و RTL برای ثبت درخواست نسخه بدون حساب بیمار، fan-out به داروخانه‌های تأییدشده، ثبت پاسخ موجودی، انتخاب نهایی داروخانه و مدیریت ثبت‌نام داروخانه‌ها.

## پیش‌نیاز

- Node.js 22 و npm
- Docker و Docker Compose برای PostgreSQL، Redis و MinIO
- برای Android: Android Studio و JDK سازگار با Capacitor 7
- برای iOS: Xcode و Swift Package Manager؛ ساخت iOS در macOS انجام می‌شود

## اجرای توسعه

```bash
cp .env.example .env
npm ci
docker compose up -d postgres redis minio minio-init
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

وب در `http://localhost:5173` و API در `http://localhost:4000` اجرا می‌شود. مقدارهای خالی Secret در `.env.example` باید فقط برای محیط محلی با مقدار تصادفی حداقل ۳۲ کاراکتر تکمیل شوند. برای ساخت کاربر اولیه مدیریت، سه مقدار `ADMIN_INITIAL_*` را در `.env` قرار دهید؛ رمز خام Log نمی‌شود.

## Commandهای اصلی

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run build
npm run test:e2e
npm run cap:sync
```

`test:integration` به PostgreSQL و Redis در حال اجرا نیاز دارد. E2E وب به‌صورت مستقل فرم بیمار و رفتار Responsive/شرطی را بررسی می‌کند؛ سناریوی کامل عملیاتی در محیطی اجرا می‌شود که API، DB، Redis و MinIO فعال باشند.

## مسیرهای محصول

- بیمار: `/`، `/request`، `/request/:publicId`
- داروخانه: `/pharmacy/register`، `/pharmacy/login`، `/pharmacy/dashboard`
- مدیریت: `/admin/login`، `/admin/dashboard`
- مستندات Swagger: `/docs` در صورت فعال بودن `SWAGGER_ENABLED`
- Health عمومی: `/health`

## معماری

React/Vite و Capacitor فقط با REST API نسخه‌دار `/api/v1` ارتباط دارند. PostgreSQL، Redis و S3/MinIO فقط از Backend قابل دسترسی‌اند. شرح مرزها در [docs/architecture.md](docs/architecture.md) و مدل داده در [docs/database.md](docs/database.md) آمده است.

## استقرار

قبل از استقرار، `.env.production.example` را به `.env.production` کپی کنید، همه Secretها را با Secret Manager یا مقدار تصادفی امن جایگزین کنید، گواهی‌ها را در `docker/nginx/certs` قرار دهید و Compose تولید را با فایل Env اجرا کنید:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

راهنمای TLS، Backup/Restore، Capacitor و محدودیت‌های واقعی در [docs/deployment.md](docs/deployment.md) است.

این Repository هیچ اتصال واقعی به بیمه، سامانه نسخه الکترونیک، SMS، پرداخت، OCR یا AI ندارد؛ کد رهگیری فقط به‌عنوان داده ورودی اعتبارسنجی و ذخیره می‌شود.
