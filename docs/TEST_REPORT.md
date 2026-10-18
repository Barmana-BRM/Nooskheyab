# گزارش واقعی Validation

## به‌روزرسانی بازطراحی — ۲۰۲۶-۱۰-۱۸

Lint، Format، Typecheck، Build، ۲۰ Unit Test، یک Integration Test واقعی PostgreSQL/Redis و ۱۶ تست Playwright موفق شدند. دو تست مرورگر، نام «نسخه‌یاب» را در عنوان، ناوبری و Manifest بررسی می‌کنند. Smoke مرورگر «ثبت بیمار → پاسخ دو داروخانه → انتخاب نهایی» نیز روی API واقعی موفق بود. Sync Android/iOS با هشدار SPM موفق شد. Audit وابستگی‌ها هنوز موفق نیست؛ محدودیت‌ها و جزئیات جدید در [گزارش بازطراحی](UI_REDESIGN_REPORT_FA.md) ثبت شده‌اند.

## گزارش تاریخی — ۲۰۲۶-۰۹-۰۳

تاریخ اجرای این گزارش: ۲۰۲۶-۰۹-۰۳. نتیجه هر Command بر اساس exit code واقعی ثبت شده است؛ `BLOCKED` به معنی مانع محیطی است و موفقیت محسوب نمی‌شود.

| Command                                                                                                                                   | Result             | Evidence                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --legacy-peer-deps --force`                                                                                                       | PASS               | نصب پاک وابستگی‌ها کامل شد.                                                                                                                                                 |
| `npm run format:check`                                                                                                                    | PASS               | تمام فایل‌ها با Prettier منطبق بودند.                                                                                                                                       |
| `npm run lint`                                                                                                                            | PASS               | ESLint بدون Warning یا Error اجرا شد.                                                                                                                                       |
| `npm run typecheck`                                                                                                                       | PASS               | TypeScript strict برای packageهای shared، API و Web موفق بود.                                                                                                               |
| `npm run test:unit`                                                                                                                       | PASS               | ۱۷ تست Vitest در API و Web موفق شد.                                                                                                                                         |
| `npm run test:integration`                                                                                                                | BLOCKED            | PostgreSQL در `localhost:5432` در دسترس نبود؛ suite با `PrismaClientInitializationError` متوقف شد.                                                                          |
| `npm run build`                                                                                                                           | PASS               | Prisma Client، Build API و Build تولیدی Web موفق شد.                                                                                                                        |
| `npm run test:e2e`                                                                                                                        | PASS               | دو سناریوی مرورگر Desktop و Mobile با Chrome نصب‌شده موفق شد.                                                                                                               |
| `npm run cap:sync`                                                                                                                        | PASS WITH WARNINGS | Build و Sync Android/iOS موفق شد؛ هشدار ناسازگاری نسخه Capacitor و نبود SPM برای dependency خارجی secure-storage باقی است، اما پلاگین Keychain محلی iOS در پروژه وجود دارد. |
| `npx prisma validate --schema apps/api/prisma/schema.prisma`                                                                              | PASS               | Schema معتبر است.                                                                                                                                                           |
| `docker compose config --quiet`                                                                                                           | PASS               | Compose توسعه معتبر است.                                                                                                                                                    |
| `PRODUCTION_ENV_FILE=.env.production.example docker compose --env-file .env.production.example -f docker-compose.prod.yml config --quiet` | PASS               | Compose تولید معتبر است.                                                                                                                                                    |
| `npm audit --omit=dev`                                                                                                                    | PASS               | آسیب‌پذیری Production dependency گزارش نشد (`0 vulnerabilities`).                                                                                                           |
| `docker compose up -d postgres redis minio minio-init`                                                                                    | BLOCKED            | دسترسی به Docker socket (`~/.docker/run/docker.sock`) با خطای permission denied رد شد.                                                                                      |

## Native و سرویس‌های واقعی

- `npx cap add android` موفق شد و پروژه Android در `apps/web/android` ایجاد شد.
- `npx cap add ios` به دلیل نصب نبودن CocoaPods موفق نشد؛ پروژه iOS با قالب SPM موجود در Capacitor نگه‌داری، پلاگین Keychain محلی به آن اضافه و `cap sync ios` روی آن موفق شد.
- `./gradlew assembleDebug` برای Android اجرا شد اما به علت Resolve نشدن `com.android.tools.build:gradle:8.2.1` از Repositoryهای Google/Maven شکست خورد؛ Build و Signing نهایی Android/iOS در این محیط قابل تأیید نیست. برای iOS نیز `xcode-select` روی CommandLineTools است و Xcode کامل در دسترس نیست.
- تست Integration به PostgreSQL و Redis واقعی نیاز دارد و به علت Docker socket اجرا نشد؛ بنابراین مسیر کامل DB-backed به‌عنوان PASS ادعا نمی‌شود.

## دامنه تست‌های پیاده‌سازی‌شده

Unitها نرمال‌سازی موبایل، اعتبارسنجی کد ملی، رمزنگاری رمز عبور و Token، Masking، RBAC، انتقال وضعیت ثبت‌نام و Aggregation وضعیت نسخه را پوشش می‌دهند. تست Integration سناریوی fan-out، جداسازی Tenant، Token نامعتبر، پاسخ‌ها، انتخاب اتمیک و بسته‌شدن Assignmentها را آماده و وابسته به PostgreSQL/Redis واقعی اجرا می‌کند. تست E2E مرورگر فرم عمومی و رفتار Responsive/شرطی را پوشش می‌دهد.
