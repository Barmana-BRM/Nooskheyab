# Nooskheyab | نسخه‌یاب

نسخه‌یاب یک سامانه فارسی و راست‌به‌چپ برای ارتباط ساختاریافته میان بیمار و داروخانه است. بیمار می‌تواند بدون ساخت حساب کاربری و رمز عبور، درخواست نسخه و اقلام آن را ثبت کند؛ داروخانه‌های مجاز شهر درخواست را بررسی می‌کنند؛ نتیجه، وضعیت آماده‌سازی و تحویل در یک مسیر قابل پیگیری ثبت می‌شود.

این سند بر اساس سورس واقعی شاخه new، فایل‌های محیطی نمونه، Prisma schema، migrationها، کنترلرهای API، رابط وب و آزمون‌های موجود نوشته شده است. وضعیت‌های وابسته به سرویس خارجی در این سند موفقیت واقعی تلقی نشده‌اند.

<a id="toc"></a>

## فهرست مطالب

- [معرفی پروژه](#intro)
- [اهداف و مزایا](#goals)
- [گردش کار](#workflow)
- [قابلیت‌ها و وضعیت واقعی](#capabilities)
- [نقش‌های کاربری و پنل‌ها](#roles)
- [تکنولوژی‌ها](#technology)
- [معماری و ساختار پوشه‌ها](#architecture)
- [پیش‌نیازها](#prerequisites)
- [دریافت و نصب](#installation)
- [تنظیمات محیطی](#environment)
- [دیتابیس و migration](#database)
- [اجرای توسعه](#development)
- [اجرای Docker](#docker)
- [Build و اجرای production](#production)
- [مستندات API](#api)
- [احراز هویت و امنیت](#security)
- [سرویس‌های جانبی](#integrations)
- [تست و کنترل کیفیت](#testing)
- [رفع مشکلات رایج](#troubleshooting)
- [وضعیت فعلی توسعه](#current-status)
- [مستندات مرتبط](#related-docs)

<a id="intro"></a>

## ۱. معرفی پروژه

هدف نسخه‌یاب این است که بیمار برای پیدا کردن اقلام نسخه مجبور نباشد به چندین داروخانه مراجعه کند. در مسیر پیش‌فرض، درخواست به داروخانه‌های فعال، تأییدشده و دارای مجوز معتبر در همان شهر ارسال می‌شود. هر داروخانه پاسخ کلی و پاسخ قلم‌به‌قلم ثبت می‌کند. اولین تراکنش معتبر با اقدام صریح پذیرش کامل، در صورت پوشش همه اقلام و عبور از کنترل‌های مجوز و موجودی، مسئول تأمین درخواست می‌شود.

پذیرش نسخه با آماده‌شدن دارو یکی نیست. پذیرش فقط مسئولیت تأمین و ایجاد سفارش را ثبت می‌کند؛ داروخانه باید سفارش را به PREPARING و سپس READY_FOR_PICKUP یا مسیر تحویل برساند. تحویل فقط با کد اثبات تحویل همان سفارش ثبت می‌شود و بعد از آن بیمار مجاز به ثبت امتیاز و نظر است.

در وضعیت فعلی:

- مسیر اصلی شهرمحور و پذیرش اتمیک تک‌داروخانه‌ای در کد و آزمون‌های یکپارچه پوشش دارد.
- مسیرهای مقایسه پیش‌فاکتور و تأمین چندداروخانه‌ای در API، مدل داده و بخشی از رابط پیاده‌سازی شده‌اند.
- پیامک واقعی، OCR واقعی، استعلام نسخه الکترونیک و بیمه، نقشه و پیک به قرارداد و دسترسی خارجی نیاز دارند و در محیط فعلی اتصال زنده ندارند.
- سابقه‌های قدیمی بدون اقلام ساختاریافته به‌صورت legacy نگه داشته می‌شوند و برای آن‌ها دارو، قیمت، موجودی یا تحویل ساختگی تولید نمی‌شود.
- این مخزن با شواهد فعلی «آماده production» اعلام نمی‌شود؛ اجرای production به تنظیم Secret Manager، سرویس‌های خارجی، TLS، پایش و آزمون بازیابی نیاز دارد.

<a id="goals"></a>

## ۲. اهداف و مزایای سامانه

نسخه‌یاب این اهداف را دنبال می‌کند:

- کاهش مراجعه‌های غیرضروری بیمار به داروخانه‌های مختلف
- کوتاه‌کردن زمان جست‌وجوی اقلام نسخه
- ارسال کنترل‌شده درخواست به داروخانه‌های واجد شرایط
- جداکردن هویت ثبت‌کننده از بیمار در مدل درخواست
- نمایش پاسخ دقیق برای هر قلم به‌جای یک وضعیت کلی گمراه‌کننده
- ثبت شفاف پذیرش، آماده‌سازی، آماده تحویل، تحویل و لغو
- نگهداری تاریخچه درخواست‌های احراز‌شده و دسترسی خانوادگی با رضایت
- ایجاد ابزار مدیریتی برای بررسی داروخانه‌ها، کاربران، بیمه‌های فهرست‌شده و Audit Log
- ارائه گزارش عملیاتی JSON و CSV با کنترل دسترسی و محافظت در برابر Formula Injection

<a id="workflow"></a>

## ۳. نحوه عملکرد پروژه

### مسیر پیش‌فرض بیمار

۱. بیمار در مسیر /request وارد شهر، اطلاعات تماس، اطلاعات نسخه و اقلام نسخه می‌شود. فرم فعلی کد ملی، کد رهگیری نسخه و بیمه پایه را نیز دریافت می‌کند.

۲. درخواست با یک شناسه عمومی تصادفی و یک توکن دسترسی تصادفی ساخته می‌شود. توکن خام فقط در پاسخ ایجاد درخواست به کلاینت داده می‌شود و در PostgreSQL به شکل hash نگه‌داری می‌شود.

۳. اگر شهر درخواست مشخص باشد، فقط داروخانه‌های APPROVED، فعال، حذف‌نشده و دارای تاریخ مجوز معتبر همان شهر دعوت می‌شوند. حالت پیش‌فرض CITY_BROADCAST_FIRST_FULL است و همه داروخانه‌های واجد شرایط شهر را هدف می‌گیرد.

۴. داروخانه با حساب تأییدشده خود درخواست را می‌بیند، برای اقلام پاسخ می‌دهد و می‌تواند پاسخ FULL_AVAILABLE، PARTIAL_AVAILABLE یا NOT_AVAILABLE ثبت کند.

۵. پاسخ ناقص، مشاهده درخواست، درج قیمت یا پیشنهاد جایگزین به‌تنهایی درخواست را نمی‌بندد. پذیرش نهایی فقط از مسیر accept-full و با نقش PHARMACY_ADMIN، نسخه و دور جاری، پوشش معتبر همه اقلام و کنترل موجودی انجام می‌شود.

۶. تراکنش پایگاه داده اولین پذیرش معتبر را برنده می‌کند. درخواست‌های رقیب حذف نمی‌شوند و پس از بسته‌شدن، سابقه آن‌ها باقی می‌ماند.

۷. سفارش با وضعیت ACCEPTED ایجاد می‌شود. بیمار وضعیت داروخانه منتخب، آدرس، شماره تماس، ساعات کاری و اطلاعات آماده‌سازی را در صفحه پیگیری می‌بیند؛ پیامک واقعی فقط پس از اتصال provider قابل ارسال است.

۸. داروخانه سفارش را به PREPARING و سپس READY_FOR_PICKUP یا READY_FOR_DELIVERY می‌برد. در مسیر پیک، OUT_FOR_DELIVERY مرحله بعدی است.

۹. تحویل با proofCode مخصوص سفارش ثبت می‌شود. سفارش تحویل‌شده دوباره قابل تحویل نیست.

۱۰. پس از DELIVERED، بیمار می‌تواند یک امتیاز ۱ تا ۵ و نظر اختیاری برای همان سفارش و داروخانه ثبت کند.

### تفاوت وضعیت‌ها

| مفهوم                  | معنی                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| پذیرش نسخه             | داروخانه به‌صورت صریح و معتبر تأمین همه اقلام را قبول کرده و سفارش ایجاد شده است.    |
| آماده‌سازی             | داروخانه در حال آماده‌کردن سفارش است؛ این وضعیت به معنی آماده‌بودن برای مراجعه نیست. |
| آماده تحویل            | سفارش برای دریافت حضوری آماده است یا در مسیر تحویل به مرحله مناسب رسیده است.         |
| تحویل نهایی            | با اثبات تحویل معتبر ثبت شده و شرط امتیازدهی را فراهم می‌کند.                        |
| کامل یا ناقص بودن پاسخ | خلاصه پاسخ جست‌وجو است و به‌تنهایی مالکیت سفارش یا بسته‌شدن رقابت را تعیین نمی‌کند.  |

### حالت‌های ذخیره‌شده روی هر درخواست

تغییر تنظیمات بعدی مدیر، حالت درخواست‌های در جریان را تغییر نمی‌دهد.

| حالت                      | رفتار                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| CITY_BROADCAST_FIRST_FULL | پیش‌فرض؛ ارسال به همه داروخانه‌های مجاز همان شهر و انتخاب اولین پذیرش کامل معتبر         |
| SMART_FIRST_FULL          | ارسال مرحله‌ای با batch و تأخیر قابل تنظیم؛ پیاده‌سازی رتبه‌بندی وزنی کامل هنوز ناقص است |
| PATIENT_COMPARE           | دریافت پیش‌فاکتور و انتخاب اتمیک بیمار؛ پاسخ کامل بدون انتخاب بیمار سفارش قطعی نمی‌سازد  |
| SPLIT_FULFILLMENT         | تخصیص اقلام به چند پیش‌فاکتور با تأیید بیمار و ساخت سفارش‌های فرزند                      |

درخواست ویرایش‌شده، نسخه و دور جدید می‌گیرد. پاسخ‌های دور یا نسخه قدیمی دیگر نمی‌توانند درخواست جاری را تغییر دهند. درخواست legacy بدون اقلام ساختاریافته قابل ویرایش اقلام نیست.

<a id="capabilities"></a>

## ۴. قابلیت‌ها و وضعیت واقعی

مدل یا فایل به‌تنهایی تکمیل قابلیت را ثابت نمی‌کند؛ وضعیت زیر با ترکیب کد، رابط موجود و آزمون‌های اجراشده تعیین شده است.

| شماره | قابلیت                      | مسیرها و مدل‌های اصلی                                                                                                                                                   | وضعیت واقعی                    | محدودیت یا شاهد                                                                                                                                         |
| ----: | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     ۱ | مدیریت اقلام نسخه           | apps/api/src/prescriptions، apps/api/src/workflow، PrescriptionRevision، PrescriptionItem، PharmacyResponseItem، PrescriptionAlternative؛ رابط /request و پاسخ داروخانه | پیاده‌سازی و تأییدشده          | چند قلم، مقدار و بسته، پاسخ قلم‌به‌قلم، نسخه‌بندی و رد پاسخ stale در آزمون یکپارچه پوشش دارد. تأیید انسانی خروجی OCR مستقل است.                         |
|     ۲ | پیامک و OTP                 | WorkflowService، OtpChallenge، PatientSession، OutboxEvent؛ /patient/otp/request و /patient/otp/verify                                                                  | وابسته به سرویس خارجی          | hash امن، هدف مجزا، انقضا، تلاش، resend و rate limit وجود دارد و OTP محلی آزموده شده است؛ provider و ارسال واقعی SMS در دسترس نیست.                     |
|     ۳ | چرخه سفارش و تحویل          | Order، OrderItem، OrderStatusHistory، DeliveryEvent، OrderRating؛ /pharmacy/orders/:id/status و /prescriptions/:publicId/orders/:orderId/rating                         | پیاده‌سازی و تأییدشده          | مسیرهای حضوری، پیک داخلی، اثبات تحویل، لغو، آزادسازی رزرو و امتیاز در تست محلی پوشش دارند؛ اتصال پیک خارجی موجود نیست.                                  |
|     ۴ | تخصیص هوشمند و مرحله‌ای     | DispatchRound، ExpirationService، SMART_DISPATCH_BATCH_SIZE، SMART_DISPATCH_STAGE_DELAY_MINUTES                                                                         | در حال توسعه یا ناقص           | فیلتر شهر، مرحله، قفل و توقف پس از پذیرش وجود دارد؛ رتبه‌بندی شفاف بر اساس فاصله، ساعات، ظرفیت و عملکرد هنوز کامل نیست.                                 |
|     ۵ | تاریخچه بیمار و خانواده     | PatientProfile، PatientSession، FamilyAccess؛ /patient/history و /patient/family؛ /patient/history در وب                                                                | در حال توسعه یا ناقص           | تاریخچه به پروفایل احراز‌شده محدود است و تست OTP/history دارد. رابط و پوشش آزمون کامل مدیریت خانواده هنوز محدود است.                                    |
|     ۶ | موجودی، رزرو و پیش‌فاکتور   | InventoryItem، InventoryReservation، Quote، QuoteItem؛ /pharmacy/inventory و quote و مسیرهای compare/split                                                              | در حال توسعه یا ناقص           | رزرو اتمیک، guard موجودی، جمع مبلغ و انتخاب پیش‌فاکتور در API و تست وجود دارد؛ پنل کامل موجودی/گزارش و سیاست provider قیمت یا بیمه تکمیل نیست.          |
|     ۷ | نسخه الکترونیک و بیمه واقعی | InsuranceProvider و InsuranceService؛ /insurance/base و /insurance/supplementary                                                                                        | وابسته به سرویس خارجی          | فهرست داخلی بیمه و اعتبارسنجی شکلی کد وجود دارد؛ استعلام اعتبار نسخه، سهم بیمه یا تعهد پرداخت با provider واقعی پیاده نشده است.                         |
|     ۸ | تصویر/PDF و OCR             | PrescriptionAttachment، OcrJob، StorageService؛ /patient/prescriptions/:publicId/attachments                                                                            | پیاده‌سازی‌شده اما آزمایش‌نشده | allowlist، magic-byte، سقف حجم/تعداد، رضایت و signed URL خصوصی کدنویسی شده است؛ اجرای MinIO در این محیط و provider OCR تأیید نشد و OCR فقط draft است.   |
|     ۹ | تأمین چندداروخانه‌ای و پیک  | FulfillmentPlan، FulfillmentPlanItem، FulfillmentPlanAllocation، سفارش‌های فرزند                                                                                        | در حال توسعه یا ناقص           | طرح تقسیم اقلام و تأیید اتمیک در تست optional-modes پوشش دارد؛ رهگیری، callback و سیاست حمل پیک خارجی موجود نیست.                                       |
|    ۱۰ | گفت‌وگو                     | Conversation، ConversationMessage؛ مسیرهای patient و pharmacy در WorkflowController                                                                                     | در حال توسعه یا ناقص           | محدوده دسترسی، بسته‌شدن گفتگو و idempotency پیام در backend وجود دارد؛ صفحه کامل گفتگو، realtime و ضمیمه پیام در رابط فعلی تکمیل نیست.                  |
|    ۱۱ | داشبورد و گزارش             | /admin/dashboard، /pharmacy/reports/operations، /admin/reports/operations و CSV                                                                                         | در حال توسعه یا ناقص           | داشبوردهای فعلی و JSON/CSV با فیلتر و جلوگیری از Formula Injection وجود دارد؛ Excel، هشدار دوره‌ای، نمودارهای گزارش عملیاتی و رابط کامل گزارش باقی است. |
|    ۱۲ | امنیت و عملیات              | RolesGuard، ApprovedPharmacyGuard، AuditLog، RefreshSession، health، outbox و پیکربندی محیط                                                                             | در حال توسعه یا ناقص           | RBAC، tenant check، نشست، CSRF مرورگر، audit و health وجود دارد؛ MFA واقعی مدیر، آزمون restore پشتیبان، worker provider و runbook کامل هنوز آماده نیست. |

### چیزهایی که در حال حاضر کار می‌کنند

- ثبت درخواست ساختاریافته چندقلمی و پاسخ قلم‌به‌قلم
- ارسال شهرمحور به داروخانه‌های واجد شرایط
- پذیرش کامل اتمیک با محدودیت یک سفارش فعال در حالت تک‌داروخانه‌ای
- جلوگیری از پذیرش کاربر صرفاً با عضویت یا ثبت موجودی؛ پذیرش کامل به PHARMACY_ADMIN محدود است
- حالت‌های چهارگانه درخواست و نگهداری حالت روی خود درخواست
- نسخه‌بندی اقلام و بی‌اعتبارکردن دور/پاسخ قدیمی
- سفارش، رزرو موجودی، آماده‌سازی، آماده تحویل، تحویل با کد و امتیاز
- OTP بیمار، نشست بیمار، تاریخچه محدود به scope و دسترسی خانواده در API
- پیش‌فاکتور، مقایسه و طرح تأمین چندداروخانه‌ای در API
- فایل خصوصی نسخه با URL امضاشده کوتاه‌عمر در مرز StorageService
- داشبورد پایه بیمار، داروخانه و مدیر
- migrationهای افزایشی و نگهداری رکوردهای legacy

<a id="roles"></a>

## ۵. نقش‌های کاربری و پنل‌ها

### بیمار و ثبت‌کننده

بیمار حساب کاربری و رمز عبور اجباری ندارد. فرم عمومی /request اطلاعات ثبت‌کننده و بیمار را جدا نگه می‌دارد و درخواست با توکن تک‌درخواست قابل پیگیری است. برای تاریخچه، تغییر اقلام، لغو، انتخاب پیشنهاد، دسترسی خانواده، فایل، گفتگو و امتیازدهی، نشست حاصل از OTP بیمار نیز لازم است.

دارنده توکن یک درخواست، مجوز مشاهده تاریخچه همه درخواست‌ها یا اعضای خانواده نیست. توکن عمومی نیز به‌تنهایی مجوز mutationهای حساس را ایجاد نمی‌کند.

مسیرهای وب بیمار:

- / برای صفحه اصلی
- /request برای ثبت درخواست
- /request/success برای نتیجه ایجاد
- /request/track برای ورود به لینک پیگیری
- /request/:publicId برای وضعیت و عملیات درخواست
- /patient/history برای تاریخچه پس از OTP

### داروخانه

- PHARMACY_ADMIN: مسئول حساب و داروخانه؛ مدیریت اطلاعات داروخانه، اسناد، ارسال برای بررسی و پذیرش کامل را انجام می‌دهد.
- PHARMACY_USER: کاربر عملیاتی داروخانه؛ می‌تواند درخواست‌های مجاز را ببیند و پاسخ عملیات مجاز خود را ثبت کند، اما accept-full فقط برای PHARMACY_ADMIN است.

هر دو نقش برای عملیات نسخه به حساب داروخانه APPROVED، فعال و دارای مجوز منقضی‌نشده نیاز دارند. شناسه داروخانه از توکن کاربر گرفته می‌شود و از body یا query پذیرفته نمی‌شود.

مسیرهای وب داروخانه:

- /pharmacy/login
- /pharmacy/register
- /pharmacy/dashboard
- /pharmacy/requests
- /pharmacy/history
- /pharmacy/requests/:id
- /pharmacy/profile
- /pharmacy/registration-status

### مدیر

- ADMIN و SUPER_ADMIN برای پنل مدیریت به JWT معتبر و RolesGuard نیاز دارند.
- مسیرهای پنل شامل داشبورد، درخواست‌ها، ثبت‌نام داروخانه، داروخانه‌ها، کاربران، بیمه‌های فهرست‌شده و Audit Log است.
- تفاوت مجوزهای جزئی هر عملیات باید از کد و policy همان محیط بررسی شود؛ همه مسیرهای مدیر در حال حاضر به‌صورت عمومی قابل دسترسی نیستند.

مسیرهای وب مدیر:

- /admin/login
- /admin/dashboard
- /admin/prescriptions
- /admin/prescriptions/:id
- /admin/pharmacy-registrations
- /admin/pharmacy-registrations/:id
- /admin/pharmacies
- /admin/pharmacies/create
- /admin/pharmacies/:id
- /admin/users
- /admin/insurance
- /admin/logs

اطلاعات ورود واقعی در این README یا seed قرار نمی‌گیرد. seed فقط در صورت پرشدن هر سه ADMIN_INITIAL_USERNAME، ADMIN_INITIAL_PASSWORD و ADMIN_INITIAL_MOBILE یک SUPER_ADMIN اولیه می‌سازد.

<a id="technology"></a>

## ۶. تکنولوژی‌های پروژه

نسخه‌های کتابخانه‌ای زیر از package-lock.json نصب‌شده استخراج شده‌اند؛ نسخه پایه imageهای Docker نیز از Dockerfile و Compose خوانده شده است.

| بخش                     | تکنولوژی و نسخه واقعی                                        | کاربرد                                                                |
| ----------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| Runtime محلی مشاهده‌شده | Node.js v24.22.1 و npm 11.9.0                                | اجرای آزمون‌ها و scriptهای workspace در محیط بررسی                    |
| Runtime کانتینر         | node:22-alpine                                               | پایه Dockerfileهای API و Web؛ برای توسعه محلی همین major توصیه می‌شود |
| مدیریت بسته             | npm workspaces و package-lock.json                           | نصب تکرارپذیر با npm ci                                               |
| Frontend                | React 18.3.1، React Router 7.18.3، Vite 6.4.3                | رابط وب فارسی RTL و routing                                           |
| داده‌گیری Frontend      | TanStack React Query 5.102.8                                 | query، mutation و refresh وضعیت‌ها                                    |
| Backend                 | NestJS 11.2.x، TypeScript 5.9.3                              | REST API، moduleها، guardها و سرویس دامنه                             |
| اعتبارسنجی              | class-validator 0.14.4، class-transformer 0.5.1، Zod 3.25.76 | اعتبارسنجی DTO، فرم و تنظیمات                                         |
| دیتابیس                 | PostgreSQL 16-alpine                                         | داده اصلی، تراکنش‌ها و constraintها                                   |
| ORM                     | Prisma و @prisma/client 6.19.3                               | schema، migration و دسترسی type-safe                                  |
| Cache و هماهنگی         | Redis 7-alpine و ioredis 5.11.1                              | rate limit، lock و cache/idempotency best effort                      |
| احراز هویت              | JWT، Argon2id، cookie-parser و CSRF token                    | حساب‌های داروخانه/مدیر و نشست قابل ابطال                              |
| ذخیره فایل              | AWS SDK S3 3.1124.0 و MinIO/S3-compatible                    | فایل خصوصی و URL امضاشده کوتاه‌عمر                                    |
| زمان‌بندی               | @nestjs/schedule 5.0.1                                       | انقضای درخواست و گسترش مرحله‌ای SMART در همان API process             |
| امنیت HTTP              | Helmet 8.3.0، CORS، ValidationPipe                           | headerهای امنیتی، origin و کنترل ورودی                                |
| تست API                 | Vitest 2.1.9                                                 | unit و integration تست‌های API                                        |
| تست وب                  | Vitest، Testing Library، Playwright 1.62.1 و axe-core        | unit و E2E رابط و دسترس‌پذیری                                         |
| اپ موبایل               | Capacitor 7.6.9                                              | بسته‌های Android/iOS و secure storage                                 |
| Reverse proxy           | Nginx unprivileged در web و Nginx سفارشی در edge             | SPA fallback، TLS، proxy API و storage                                |

<a id="architecture"></a>

## ۷. معماری و ساختار پوشه‌ها

### ساختار واقعی در سطح بالا

```text
.
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── admin/
│   │   │   ├── common/
│   │   │   ├── insurance/
│   │   │   ├── pharmacy/
│   │   │   ├── prescriptions/
│   │   │   └── workflow/
│   │   └── prisma/
│   │       ├── migrations/
│   │       ├── schema.prisma
│   │       └── seed.ts
│   └── web/
│       ├── src/
│       │   ├── components/
│       │   ├── lib/
│       │   ├── pages/
│       │   └── styles/
│       ├── public/
│       ├── android/
│       ├── ios/
│       └── capacitor.config.ts
├── packages/
│   ├── api-client/
│   ├── config/
│   ├── types/
│   ├── ui/
│   └── validation/
├── docker/
│   ├── nginx/
│   └── postgres/
├── docs/
├── docker-compose.yml
├── docker-compose.prod.yml
├── package.json
├── package-lock.json
└── README.md
```

### مسئولیت لایه‌ها

- apps/web فقط رابط و transport کلاینت را اجرا می‌کند و به REST API نسخه‌دار /api/v1 وصل می‌شود.
- apps/api مالک احراز هویت، مجوز، state transition، تراکنش پذیرش، audit و دسترسی فایل است.
- PostgreSQL منبع اصلی داده است. تاریخ‌ها در PostgreSQL به‌صورت UTC ذخیره می‌شوند.
- Redis برای محدودسازی، lock و بهینه‌سازی استفاده می‌شود؛ در منطق اصلی، جایگزین constraint و تراکنش PostgreSQL نیست.
- MinIO یا هر S3-compatible داخلی از API قابل دسترسی است. خواندن فایل پس از مجوز backend با URL کوتاه‌عمر امضاشده انجام می‌شود.
- packages/types قراردادهای مشترک، packages/validation قواعد فرم و نرمال‌سازی، packages/config schema محیط، packages/api-client احراز و refresh کلاینت و packages/ui اجزای رابط RTL را نگه می‌دارند.
- worker مستقل در package یا command جدا وجود ندارد؛ jobهای انقضا و SMART با @nestjs/schedule داخل process API اجرا می‌شوند. Outbox رکورد پایدار رویداد را نگه می‌دارد، اما worker واقعی ارسال SMS/OCR/provider در این نسخه وجود ندارد.

### نمودار معماری

```mermaid
flowchart LR
  Patient[Patient browser or Capacitor] --> Web[React and Vite web]
  Web -->|REST /api/v1| API[NestJS API]
  API --> Prisma[Prisma]
  Prisma --> DB[(PostgreSQL)]
  API --> Redis[(Redis)]
  API --> Storage[(Private S3 or MinIO)]
  API --> Providers[External provider boundaries]
  API --> Scheduler[Nest Schedule jobs]
  Admin[Admin or pharmacy portal] --> Web
  Edge[Nginx in production] --> Web
  Edge --> API
  Edge --> Storage
```

### نمودار گردش درخواست

```mermaid
flowchart TD
  A[Create structured prescription] --> B{Eligible pharmacies in city}
  B --> C[Assignments and notifications]
  C --> D[Item level responses]
  D --> E{Request mode}
  E -->|City or smart full| F[First valid full acceptance]
  E -->|Patient compare| G[Submitted quotes]
  E -->|Split fulfillment| H[Patient approved allocation plan]
  F --> I[Order and inventory reservation]
  G --> I
  H --> J[Parent and child orders]
  I --> K[Preparing]
  J --> K
  K --> L[Ready or out for delivery]
  L --> M[Delivery proof]
  M --> N[Rating]
```

<a id="prerequisites"></a>

## ۸. پیش‌نیازهای نصب

### ابزارها

- Node.js: Dockerfileها از Node 22 استفاده می‌کنند. محیط بررسی حاضر Node v24.22.1 داشت و scriptهای پروژه در آن اجرا شدند؛ برای هم‌خوانی، Node 22 LTS پیشنهاد می‌شود.
- npm همراه Node و package-lock.json؛ نصب وابستگی با npm ci انجام شود.
- PostgreSQL 16، Redis 7 و MinIO را می‌توان با Docker Compose محلی اجرا کرد.
- برای migration به Prisma CLI موجود در devDependencies نیاز است.
- برای E2E به مرورگر Chromium سازگار با Playwright نیاز است.
- برای Android به Android Studio و JDK سازگار با Capacitor 7 نیاز است.
- برای iOS به macOS، Xcode و تنظیمات signing نیاز است؛ build native iOS در محیط Linux قابل انجام نیست.
- سرویس‌های SMS، OCR، نقشه، نسخه الکترونیک، بیمه و پیک برای رفتار واقعی باید جداگانه قرارداد و credential داشته باشند.

### وضعیت سیستم‌عامل

- Linux: مسیر توسعه و آزمون این سند در محیط Linux-like بررسی شده است.
- macOS: ابزارهای Node و Docker قابل استفاده‌اند؛ اجرای Xcode و signing فقط روی macOS است و در این محیط انجام نشده است.
- Windows: استفاده از Node و Docker Desktop از نظر فایل‌های پروژه پیش‌بینی شده است، اما اجرای Windows در این مأموریت آزمایش نشده است. WSL2 روش عملی نزدیک به محیط بررسی است.

<a id="installation"></a>

## ۹. دریافت و نصب از GitHub

مخزن عمومی است و نسخه کاری این مستندات شاخه new است:

```bash
git clone --branch new --single-branch https://github.com/Barmana-BRM/Nooskheyab.git
cd Nooskheyab
```

وابستگی‌ها را از ریشه monorepo نصب کنید:

```bash
npm ci
```

برای تولید Prisma Client:

```bash
npm run db:generate
```

<a id="environment"></a>

## ۱۰. تنظیمات Environment

فایل‌های نمونه موجود هستند:

- .env.example برای توسعه
- .env.production.example برای Compose تولید
- .env در Git نادیده گرفته می‌شود و نباید commit شود

برای شروع:

```bash
cp .env.example .env
```

در .env توسعه، سه مقدار JWT و credentialهای S3/MinIO که خالی هستند را با مقدارهای محلی جایگزین کنید. JWT_ACCESS_SECRET و JWT_REFRESH_SECRET باید حداقل ۳۲ کاراکتر تصادفی داشته باشند. مقدار OTP_TEST_CODE فقط در NODE_ENV=test مجاز است و نباید در production تنظیم شود.

### متغیرهای اصلی API

| Variable                                     | کاربرد                        |                   اجباری | نمونه غیرحساس                                                    |
| -------------------------------------------- | ----------------------------- | -----------------------: | ---------------------------------------------------------------- |
| NODE_ENV                                     | محیط NestJS                   | خیر، default development | development                                                      |
| APP_ENV                                      | برچسب محیط در log             |                      خیر | development                                                      |
| PORT                                         | پورت API                      |        خیر، default 4000 | 4000                                                             |
| WEB_APP_URL                                  | مبنای لینک وب و status URL    |     بله برای مقدار معتبر | http://localhost:5173                                            |
| API_PUBLIC_URL                               | نشانی عمومی API               |     بله برای مقدار معتبر | http://localhost:4000                                            |
| CORS_ALLOWED_ORIGINS                         | originهای مجاز با comma       |                      بله | http://localhost:5173                                            |
| DATABASE_URL                                 | اتصال Prisma به PostgreSQL    |                      بله | postgresql://pharmacy:local-password@localhost:5432/pharmacy_mvp |
| REDIS_URL                                    | اتصال Redis                   |                      بله | redis://localhost:6379                                           |
| JWT_ACCESS_SECRET                            | امضای access token            |    بله، حداقل ۳۲ کاراکتر | مقدار تصادفی محلی                                                |
| JWT_ACCESS_EXPIRES_IN                        | عمر access token              |                      خیر | 15m                                                              |
| JWT_REFRESH_SECRET                           | hash/امضای refresh            |    بله، حداقل ۳۲ کاراکتر | مقدار تصادفی محلی                                                |
| JWT_REFRESH_EXPIRES_IN                       | عمر refresh                   |                      خیر | 7d                                                               |
| PRESCRIPTION_EXPIRATION_HOURS                | مهلت درخواست                  |                      خیر | 6                                                                |
| PRESCRIPTION_CREATE_RATE_LIMIT               | سقف ایجاد درخواست             |                      خیر | 5                                                                |
| PRESCRIPTION_CREATE_RATE_WINDOW_SECONDS      | پنجره rate limit ایجاد        |                      خیر | 900                                                              |
| LOGIN_RATE_LIMIT                             | سقف ورود                      |                      خیر | 5                                                                |
| LOGIN_RATE_WINDOW_SECONDS                    | پنجره rate limit ورود         |                      خیر | 900                                                              |
| OTP_EXPIRES_SECONDS                          | عمر OTP                       |                      خیر | 120                                                              |
| OTP_RESEND_SECONDS                           | فاصله resend                  |                      خیر | 60                                                               |
| OTP_MAX_ATTEMPTS                             | سقف تلاش OTP                  |                      خیر | 5                                                                |
| OTP_RATE_LIMIT                               | سقف درخواست OTP               |                      خیر | 5                                                                |
| OTP_TEST_CODE                                | کد تست فقط برای test          |           خیر و فقط test | خالی                                                             |
| SMART_DISPATCH_BATCH_SIZE                    | تعداد داروخانه هر مرحله SMART |                      خیر | 5                                                                |
| SMART_DISPATCH_STAGE_DELAY_MINUTES           | تأخیر مرحله بعد               |                      خیر | 15                                                               |
| PHARMACY_DOCUMENT_TECHNICAL_MANAGER_REQUIRED | الزام کارت مسئول فنی          |                      خیر | false                                                            |
| SWAGGER_ENABLED                              | فعال‌کردن /docs               |                      خیر | true در توسعه، false در production                               |
| LOG_LEVEL                                    | سطح log                       |                      خیر | info                                                             |

### متغیرهای سرویس خارجی

| Variable              | کاربرد            | اجباری | وضعیت                                     |
| --------------------- | ----------------- | -----: | ----------------------------------------- |
| SMS_PROVIDER_URL      | مرز پیکربندی SMS  |    خیر | مقدار به‌تنهایی اتصال واقعی ایجاد نمی‌کند |
| OCR_PROVIDER_URL      | مرز پیکربندی OCR  |    خیر | provider و worker واقعی لازم است          |
| MAPS_PROVIDER_URL     | مرز پیکربندی نقشه |    خیر | در کد فعلی اتصال کامل نقشه/ETA ندارد      |
| DELIVERY_PROVIDER_URL | مرز پیکربندی پیک  |    خیر | قرارداد و callback واقعی لازم است         |

### متغیرهای Storage

| Variable                  | کاربرد                |                                    اجباری | نمونه غیرحساس         |
| ------------------------- | --------------------- | ----------------------------------------: | --------------------- |
| S3_ENDPOINT               | endpoint داخلی SDK    |                                       بله | http://localhost:9000 |
| S3_PUBLIC_ENDPOINT        | endpoint امضای URL    | خیر در توسعه، لازم برای public production | http://localhost:9000 |
| S3_REGION                 | منطقه S3              |                                       خیر | us-east-1             |
| S3_BUCKET                 | bucket خصوصی          |                                       بله | pharmacy-documents    |
| S3_ACCESS_KEY             | کلید SDK              |                                       بله | کلید محلی MinIO       |
| S3_SECRET_KEY             | secret SDK            |                                       بله | secret محلی MinIO     |
| S3_FORCE_PATH_STYLE       | path-style برای MinIO |                                       خیر | true                  |
| S3_SIGNED_URL_TTL_SECONDS | عمر URL دانلود        |                          خیر، حداکثر 3600 | 300                   |
| UPLOAD_MAX_BYTES          | سقف هر فایل           |                                       خیر | 5242880               |
| UPLOAD_MAX_FILES          | سقف فایل‌های هر نسخه  |                                       خیر | 5                     |

### متغیرهای seed و Frontend

| Variable                    | کاربرد                   |                              اجباری | نمونه غیرحساس                |
| --------------------------- | ------------------------ | ----------------------------------: | ---------------------------- |
| ADMIN_INITIAL_USERNAME      | username مدیر اولیه seed | اختیاری؛ هر سه مقدار با هم لازم‌اند | local_admin                  |
| ADMIN_INITIAL_PASSWORD      | password مدیر اولیه seed |           اختیاری؛ حداقل ۱۰ کاراکتر | خارج از Git                  |
| ADMIN_INITIAL_MOBILE        | mobile مدیر اولیه seed   | اختیاری؛ هر سه مقدار با هم لازم‌اند | شماره تست مجاز               |
| VITE_API_BASE_URL           | base URL API در Vite     |              خیر، default localhost | http://localhost:4000/api/v1 |
| VITE_ALLOWED_EXTERNAL_HOSTS | hostهای مجاز فایل خارجی  |                                 خیر | localhost:9000               |
| VITE_APP_NAME               | نام اپ                   |                                 خیر | نسخه‌یاب                     |
| VITE_APP_ENV                | محیط Frontend            |                                 خیر | development                  |

### متغیرهای Compose

این موارد از interpolation خود Compose می‌آیند و در schema API نیستند:

| Variable            | کاربرد                                         | وضعیت یا نمونه محلی       |
| ------------------- | ---------------------------------------------- | ------------------------- |
| POSTGRES_DB         | نام دیتابیس Compose                            | pharmacy_mvp              |
| POSTGRES_USER       | کاربر PostgreSQL Compose                       | pharmacy                  |
| POSTGRES_PASSWORD   | رمز PostgreSQL؛ فقط production از env می‌خواند | خارج از Git               |
| REDIS_PASSWORD      | رمز Redis در Compose production                | خارج از Git               |
| MINIO_ROOT_USER     | کاربر root MinIO                               | خارج از Git در production |
| MINIO_ROOT_PASSWORD | رمز root MinIO                                 | خارج از Git در production |

پنج متغیر زیر پورت‌های میزبان را کنترل می‌کنند:

| Variable                | کاربرد                      |    default محلی |
| ----------------------- | --------------------------- | --------------: |
| POSTGRES_HOST_PORT      | پورت میزبان PostgreSQL      |            5432 |
| REDIS_HOST_PORT         | پورت میزبان Redis           |            6379 |
| MINIO_API_HOST_PORT     | پورت API MinIO              |            9000 |
| MINIO_CONSOLE_HOST_PORT | پورت کنسول MinIO            |            9001 |
| PRODUCTION_ENV_FILE     | مسیر فایل env Compose تولید | .env.production |

در production، URLهای عمومی، originها و S3_PUBLIC_ENDPOINT باید HTTPS باشند؛ parseEnvironment این شرط را بررسی می‌کند.

<a id="database"></a>

## ۱۱. راه‌اندازی دیتابیس

### PostgreSQL، Redis و MinIO محلی

ابتدا سرویس‌های توسعه را بالا بیاورید:

```bash
docker compose up -d postgres redis minio minio-init
```

Compose توسعه این سرویس‌ها را با volumeهای postgres_data، redis_data و minio_data اجرا می‌کند. رمزهای ثابت داخل Compose فقط برای توسعه محلی هستند و نباید در محیط دیگر استفاده شوند.

سپس از ریشه پروژه:

```bash
npm run db:generate
DATABASE_URL='postgresql://pharmacy:pharmacy_dev_password@localhost:5432/pharmacy_mvp' npm run db:migrate
DATABASE_URL='postgresql://pharmacy:pharmacy_dev_password@localhost:5432/pharmacy_mvp' npm run db:seed
```

در محیط‌هایی که Prisma فایل .env ریشه را از cwd مربوط به workspace نمی‌خواند، تعیین صریح DATABASE_URL مانند بالا لازم است. در PowerShell معادل آن:

```powershell
$env:DATABASE_URL = 'postgresql://pharmacy:pharmacy_dev_password@localhost:5432/pharmacy_mvp'
npm run db:migrate
npm run db:seed
```

seed رفتار idempotent دارد، فهرست بیمه پایه و تکمیلی را upsert می‌کند و فقط در صورت تکمیل سه متغیر ADMIN_INITIAL_* مدیر اولیه می‌سازد. seed داده بیمار، داروخانه واقعی یا نسخه واقعی تولید نمی‌کند.

### Migrationهای موجود

۱۲ migration افزایشی در apps/api/prisma/migrations وجود دارد:

- 20260902000000_init
- 20260902010000_integrity_constraints
- 20261103180000_core_workflows
- 20261103190000_order_idempotency
- 20261103192000_attachment_consent_version
- 20261103200000_split_fulfillment
- 20261103202000_conversation_scope
- 20261103210000_round_history
- 20261103211000_prescription_alternatives
- 20261103212000_item_package_quantities
- 20261103213000_single_order_guard
- 20261103214000_inventory_guards

برای محیط مشترک یا production فقط از migration deploy استفاده کنید:

```bash
DATABASE_URL='postgresql://user:password@host:5432/database' npm run db:migrate
```

دستورهای prisma migrate reset، DROP، TRUNCATE یا seed جایگزین‌کننده داده در راه‌اندازی production ارائه نشده‌اند و نباید اجرا شوند. rollback امن این پروژه forward-fix یا restore به دیتابیس ایزوله پس از بررسی است، نه rollback مخرب روی دیتابیس زنده.

### مدل داده اصلی

مدل‌های Prisma به‌صورت افزایشی این حوزه‌ها را پوشش می‌دهند:

- هویت و دسترسی: User، RefreshSession، UserPermission، AuditLog
- داروخانه: Pharmacy، PharmacyDocument، PharmacyReviewHistory، Notification
- نسخه: Prescription، PrescriptionRevision، PrescriptionItem، PrescriptionPharmacyRequest، DispatchRound
- پاسخ و جایگزین: PharmacyResponse، PharmacyResponseItem، PrescriptionAlternative
- سفارش: Order، OrderItem، OrderStatusHistory، DeliveryEvent، OrderRating
- موجودی و مبلغ: InventoryItem، InventoryReservation، Quote، QuoteItem
- بیمار و خانواده: PatientProfile، PatientSession، FamilyAccess
- فایل و OCR: PrescriptionAttachment، OcrJob
- گفتگو و رویداد: Conversation، ConversationMessage، OutboxEvent
- طرح چندداروخانه‌ای: FulfillmentPlan، FulfillmentPlanItem، FulfillmentPlanAllocation
- بیمه: InsuranceProvider

شناسه‌های داخلی UUID هستند. unique constraint، partial index و guardهای دیتابیس برای مالکیت، یکتایی سفارش فعال و جلوگیری از موجودی منفی بخشی از قرارداد داده‌اند.

<a id="development"></a>

## ۱۲. اجرای پروژه در حالت Development

### روش native

۱. فایل .env را آماده و secretهای محلی را تنظیم کنید.

۲. سرویس‌های وابسته را اجرا کنید:

```bash
docker compose up -d postgres redis minio minio-init
```

۳. migration و seed را انجام دهید:

```bash
npm run db:generate
DATABASE_URL='postgresql://pharmacy:pharmacy_dev_password@localhost:5432/pharmacy_mvp' npm run db:migrate
DATABASE_URL='postgresql://pharmacy:pharmacy_dev_password@localhost:5432/pharmacy_mvp' npm run db:seed
```

۴. API و Frontend را از ریشه هم‌زمان اجرا کنید:

```bash
npm run dev
```

این script با concurrently، dev:web و dev:api را اجرا می‌کند. dev:api ابتدا build می‌کند و سپس tsc watch و node watch را اجرا می‌کند.

آدرس‌ها:

- وب Vite: http://localhost:5173
- API: http://localhost:4000
- Health: http://localhost:4000/health
- Swagger: http://localhost:4000/docs، فقط وقتی SWAGGER_ENABLED=true باشد
- MinIO API: http://localhost:9000
- MinIO Console: http://localhost:9001

بررسی سریع:

```bash
curl http://localhost:4000/health
```

پاسخ موفق health فقط وضعیت کلی را می‌دهد:

```json
{ "status": "ok" }
```

health اتصال PostgreSQL، ping Redis و وجود bucket تنظیم‌شده را بررسی می‌کند. اطلاعات زیرساختی یا secret در پاسخ عمومی health نمایش داده نمی‌شود.

### اجرای جداگانه

در صورت نیاز:

```bash
npm run dev:api
npm run dev:web
```

اجرای worker جداگانه لازم نیست؛ زمان‌بندی‌های داخلی API با همان process فعال می‌شوند. برای اجرای رابط بدون API، بعضی صفحات عمومی باز می‌شوند اما داده‌های بیمه، ثبت درخواست و پنل‌ها به API نیاز دارند.

<a id="docker"></a>

## ۱۳. اجرای پروژه با Docker

فایل docker-compose.yml سرویس‌های postgres، redis، minio، minio-init، api و web را تعریف می‌کند. برای اجرای کامل:

```bash
cp .env.example .env
docker compose config --quiet
docker compose --env-file .env up -d --build
```

در این حالت:

- API داخلی روی 4000 اجرا می‌شود و قبل از start، migration و seed را اجرا می‌کند.
- وب از پورت میزبان 5173 به Nginx داخلی web روی 8080 وصل می‌شود.
- PostgreSQL روی 5432، Redis روی 6379، MinIO روی 9000 و کنسول MinIO روی 9001 publish می‌شوند.
- volumeهای postgres_data، redis_data و minio_data باقی می‌مانند.
- healthcheck برای PostgreSQL، Redis، MinIO و API تعریف شده است.

پشتیبانی Docker از نظر فایل Compose و build configuration وجود دارد. اجرای کامل Compose در محیط این مأموریت به‌دلیل ردشدن image minio/minio توسط registry تا انتها قابل تأیید نبود؛ بنابراین startup کامل Docker را موفق اعلام نکنید تا image از registry مجاز در دسترس باشد.

برای توقف سرویس‌های محلی بدون حذف volume:

```bash
docker compose down
```

دستورهای حذف volume یا پاک‌سازی دیتابیس در راه‌اندازی پروژه ارائه نشده‌اند.

<a id="production"></a>

## ۱۴. Build و اجرای Production

### Build

از ریشه:

```bash
npm run build
```

این script به‌ترتیب packageهای shared، API و Web را build می‌کند. برای اجرای API build‌شده:

```bash
npm --workspace apps/api run start
```

Web در حالت production به‌صورت asset استاتیک ساخته می‌شود و برای سرو آن باید از Nginx یا web container موجود در Compose استفاده شود.

### Compose تولید

فایل .env.production.example را کپی کنید و همه مقدارهای replace-with-* را خارج از Git با Secret Manager یا secret تصادفی جایگزین کنید:

```bash
cp .env.production.example .env.production
mkdir -p docker/nginx/certs
# fullchain.pem و privkey.pem را خارج از Git در این مسیر قرار دهید
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Compose تولید PostgreSQL، Redis و MinIO را فقط روی شبکه داخلی نگه می‌دارد و فقط Nginx پورت‌های 80 و 443 را publish می‌کند. API قبل از start migration deploy را اجرا می‌کند. Nginx مسیرهای /api/، /health، /docs و host جداگانه storage.example.com را proxy می‌کند.

این repository تغییر DNS، صدور گواهی، استقرار سرور زنده یا تغییر secret production را انجام نمی‌دهد. production در محیط این مأموریت اجرا نشده است. پیش از استفاده واقعی باید حداقل موارد زیر جداگانه تأیید شوند:

- HTTPS برای همه URLهای عمومی و CORS
- Secret Manager و rotation
- providerهای واقعی و callback امن
- backup رمزگذاری‌شده و restore در محیط جدا
- health/readiness، log، alert و ظرفیت‌سنجی
- signing Android/iOS در خارج از Git

### Android و iOS

برای build وب و همگام‌سازی Capacitor:

```bash
npm run build:web
npm run cap:sync
npm run cap:android
npm run cap:ios
```

cap:android و cap:ios محیط native IDE را باز می‌کنند. signing و provisioning در مخزن قرار ندارند. شناسه native فعلی com.company.pharmacyprescription است و webDir روی dist تنظیم شده است.

<a id="api"></a>

## ۱۵. مستندات API

همه مسیرهای کسب‌وکاری زیر prefix /api/v1 هستند. /health تنها استثنای prefix است.

پاسخ موفق مسیرهای API در قالب زیر envelope می‌شود:

```json
{
  "success": true,
  "data": {},
  "requestId": "..."
}
```

خطاها قالب success=false، error.code، error.message، fields اختیاری و requestId دارند. health envelope نمی‌شود.

### مسیرهای عمومی بیمار

| Method | مسیر                                                           | مجوز یا header                      | کاربرد                                         |
| ------ | -------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------- |
| GET    | /api/v1/insurance/base                                         | عمومی                               | فهرست بیمه پایه فعال                           |
| GET    | /api/v1/insurance/supplementary                                | عمومی                               | فهرست بیمه تکمیلی فعال                         |
| POST   | /api/v1/prescriptions                                          | عمومی؛ Idempotency-Key توصیه می‌شود | ایجاد درخواست و دریافت publicId و توکن اولیه   |
| GET    | /api/v1/prescriptions/:publicId                                | X-Prescription-Token                | مشاهده وضعیت و خلاصه پاسخ                      |
| POST   | /api/v1/patient/otp/request                                    | عمومی                               | درخواست OTP با purpose                         |
| POST   | /api/v1/patient/otp/verify                                     | عمومی                               | مصرف OTP و ساخت نشست بیمار در purposeهای بیمار |
| GET    | /api/v1/patient/history                                        | X-Patient-Session                   | تاریخچه محدود به پروفایل                       |
| GET    | /api/v1/patient/family                                         | X-Patient-Session                   | رابطه‌های خانواده                              |
| POST   | /api/v1/patient/prescriptions/:publicId/items                  | X-Patient-Session و توکن درخواست    | ساخت revision جدید اقلام                       |
| GET    | /api/v1/patient/prescriptions/:publicId/quotes                 | X-Prescription-Token                | پیش‌فاکتورهای submitted                        |
| POST   | /api/v1/prescriptions/:publicId/select-pharmacy                | نشست و توکن                         | مسیر سازگاری/legacy با پیش‌شرط‌های جدید        |
| POST   | /api/v1/prescriptions/:publicId/cancel                         | نشست و توکن؛ Idempotency-Key        | لغو درخواست                                    |
| POST   | /api/v1/prescriptions/:publicId/retry                          | نشست و توکن؛ Idempotency-Key        | ساخت دور جدید پس از لغو داروخانه               |
| POST   | /api/v1/patient/prescriptions/:publicId/quotes/:quoteId/accept | نشست و توکن؛ Idempotency-Key        | انتخاب اتمیک پیش‌فاکتور در compare             |
| POST   | /api/v1/patient/prescriptions/:publicId/split-plan/accept      | نشست و توکن؛ Idempotency-Key        | تأیید طرح چندداروخانه‌ای                       |
| POST   | /api/v1/prescriptions/:publicId/complete                       | نشست و توکن                         | مسیر قدیمی؛ تحویل ساختگی ایجاد نمی‌کند         |
| POST   | /api/v1/prescriptions/:publicId/orders/:orderId/rating         | نشست و توکن                         | امتیاز پس از DELIVERED                         |

برای فایل و گفتگو نیز مسیرهای patient در WorkflowController شامل attachment URL، پیام patient و خواندن پیام است. دسترسی آن‌ها به نشست، توکن، profile و assignment جاری محدود است.

### احراز هویت حساب‌ها

| Method | مسیر                 | کاربرد                                |
| ------ | -------------------- | ------------------------------------- |
| POST   | /api/v1/auth/login   | ورود username/password برای پنل       |
| GET    | /api/v1/auth/csrf    | دریافت CSRF token مرورگر              |
| POST   | /api/v1/auth/refresh | چرخش refresh در cookie یا native body |
| POST   | /api/v1/auth/logout  | ابطال refresh و پاک‌کردن cookie       |
| GET    | /api/v1/auth/me      | اطلاعات کاربر JWT                     |

### داروخانه

| Method   | مسیر                                           | نقش                             |
| -------- | ---------------------------------------------- | ------------------------------- |
| POST     | /api/v1/pharmacy/register                      | عمومی؛ ایجاد ثبت‌نام داروخانه   |
| GET      | /api/v1/pharmacy/registration-status           | PHARMACY_ADMIN یا PHARMACY_USER |
| PUT      | /api/v1/pharmacy/registration                  | PHARMACY_ADMIN                  |
| POST     | /api/v1/pharmacy/documents                     | PHARMACY_ADMIN؛ multipart       |
| DELETE   | /api/v1/pharmacy/documents/:documentId         | PHARMACY_ADMIN                  |
| GET      | /api/v1/pharmacy/documents/:documentId/url     | PHARMACY_ADMIN                  |
| POST     | /api/v1/pharmacy/submit-for-approval           | PHARMACY_ADMIN                  |
| GET      | /api/v1/pharmacy/dashboard                     | داروخانه تأییدشده               |
| GET      | /api/v1/pharmacy/prescriptions                 | داروخانه تأییدشده               |
| GET      | /api/v1/pharmacy/history                       | داروخانه تأییدشده               |
| GET      | /api/v1/pharmacy/prescriptions/:id             | داروخانه مجاز همان assignment   |
| POST     | /api/v1/pharmacy/prescriptions/:id/view        | داروخانه مجاز                   |
| POST     | /api/v1/pharmacy/prescriptions/:id/respond     | داروخانه مجاز                   |
| POST     | /api/v1/pharmacy/prescriptions/:id/accept-full | فقط PHARMACY_ADMIN              |
| POST     | /api/v1/pharmacy/orders/:id/status             | داروخانه مالک سفارش             |
| GET/POST | /api/v1/pharmacy/inventory                     | داروخانه تأییدشده               |
| POST     | /api/v1/pharmacy/prescriptions/:id/quote       | داروخانه مالک assignment        |
| GET/POST | /api/v1/pharmacy/conversations/:id/messages    | داروخانه مجاز                   |
| GET      | /api/v1/pharmacy/reports/operations            | گزارش خود داروخانه              |
| GET      | /api/v1/pharmacy/reports/operations.csv        | CSV گزارش خود داروخانه          |
| GET/POST | /api/v1/pharmacy/notifications و /read         | اعلان‌های داروخانه              |

### مدیر و گزارش

مسیرهای /api/v1/admin به ADMIN یا SUPER_ADMIN نیاز دارند و شامل dashboard، فهرست و جزئیات prescriptions، بررسی registration، CRUD و تعلیق/فعال‌سازی pharmacy، مدیریت users، مدیریت insurance و audit-logs هستند.

گزارش مدیریتی در این مسیرها است:

- GET /api/v1/admin/reports/operations
- GET /api/v1/admin/reports/operations.csv

پارامترهای فیلتر گزارش و فهرست شامل dateFrom، dateTo، city، pharmacyId، requestMode، status و در فهرست‌ها search، page، limit و sort هستند. محدودیت tenant برای مسیرهای داروخانه از user.pharmacyId می‌آید.

<a id="security"></a>

## ۱۶. احراز هویت و امنیت

- رمز حساب‌ها با Argon2id hash می‌شوند و در log یا پاسخ API قرار نمی‌گیرند.
- access tokenهای پنل کوتاه‌عمرند و به refresh session قابل ابطال وابسته‌اند.
- در browser، refresh در HttpOnly cookie و با CSRF token استفاده می‌شود؛ native refresh از secure storage کلاینت استفاده می‌کند.
- بیمار با توکن ۳۲ بایتی تصادفی و hash آن به همان درخواست محدود می‌شود. نشست بیمار نیز hash می‌شود و تاریخ انقضا و revokedAt دارد.
- OTP به purpose، mobile و challenge وابسته است؛ خام آن ذخیره یا log نمی‌شود. OTP_TEST_CODE فقط در محیط test مسیر تست است.
- RolesGuard و ApprovedPharmacyGuard کنترل نقش، عضویت داروخانه، وضعیت APPROVED، فعال‌بودن و تاریخ مجوز را انجام می‌دهند.
- پذیرش کامل فقط برای PHARMACY_ADMIN است؛ پاسخ داروخانه یا OCR جای آن را نمی‌گیرد.
- فایل‌ها public دائمی نیستند و از API پس از کنترل دسترسی URL امضاشده کوتاه‌عمر می‌گیرند.
- audit شامل actor، عمل، هدف، زمان، نتیجه و requestId است و metadata حساس توسط سرویس audit پالایش می‌شود.
- ورودی‌ها با ValidationPipe دارای whitelist، transform و forbidNonWhitelisted کنترل می‌شوند؛ Helmet، CORS و محدودیت حجم body فعال‌اند.
- CSV با BOM فارسی تولید می‌شود و سلول‌هایی که با =، +، - یا @ شروع شوند برای جلوگیری از Formula Injection محافظت می‌شوند.
- مدیر MFA کامل و کدهای بازیابی امن در این نسخه تکمیل نشده‌اند؛ وجود enum ADMIN_MFA به‌تنهایی به معنی فعال‌بودن MFA نیست.
- سیاست حذف زمان‌بندی‌شده فایل با TTL مخرب فعال نشده است؛ retention قانونی باید پیش از اجرای پاک‌سازی تعریف و ممیزی شود.
- callback واقعی provider، پایش عملیاتی کامل و آزمون restore هنوز باید در محیط مجاز تکمیل شود.

<a id="integrations"></a>

## ۱۷. سرویس‌های جانبی و وضعیت اتصال

| سرویس            | پیکربندی یا کد                                     | وضعیت واقعی                   | رفتار هنگام نبود سرویس                                                     |
| ---------------- | -------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------- |
| PostgreSQL       | DATABASE_URL، Prisma، migration                    | IMPLEMENTED_AND_VERIFIED محلی | API و health به دیتابیس نیاز دارند                                         |
| Redis            | REDIS_URL، ioredis                                 | IMPLEMENTED_AND_VERIFIED محلی | برخی rate limit/cache/lockها best effort هستند؛ منبع اصلی دیتابیس است      |
| S3/MinIO         | S3_ENDPOINT، S3_PUBLIC_ENDPOINT، StorageService    | IMPLEMENTED_NOT_LIVE_VERIFIED | health و upload به bucket نیاز دارند؛ image MinIO در این محیط pull نشد     |
| SMS              | SMS_PROVIDER_URL، OTP و outbox                     | BLOCKED_EXTERNAL              | درخواست OTP challenge/outbox می‌سازد، اما ارسال SMS واقعی انجام نمی‌شود    |
| OCR              | OCR_PROVIDER_URL، OcrJob و outbox                  | BLOCKED_EXTERNAL              | فایل و job می‌تواند ثبت شود؛ OCR خروجی نهایی یا تأیید خودکار تولید نمی‌کند |
| نقشه و geocoding | MAPS_PROVIDER_URL و مختصات اختیاری Pharmacy        | BLOCKED_EXTERNAL              | fallback شهرمحور کار می‌کند؛ فاصله و ETA رانندگی ارائه نمی‌شود             |
| نسخه الکترونیک   | مرز طراحی‌شده، بدون endpoint رسمی در کد            | BLOCKED_EXTERNAL              | کد رهگیری فقط طبق validation ثبت می‌شود؛ اعتبار provider ادعا نمی‌شود      |
| بیمه واقعی       | InsuranceProvider داخلی و فهرست base/supplementary | BLOCKED_EXTERNAL              | catalog داخلی کار می‌کند؛ پوشش، سهم بیمار و تعهد پرداخت استعلام نمی‌شود    |
| پیک              | DELIVERY_PROVIDER_URL و Order delivery states      | BLOCKED_EXTERNAL              | وضعیت داخلی سفارش قابل تست است؛ tracking/callback واقعی نداریم             |

وجود URL در environment به‌تنهایی اتصال واقعی را تأیید نمی‌کند. برای هر provider باید endpoint رسمی، authentication، قرارداد payload، timeout، retry، idempotency و روش تست محیط مجاز ارائه شود.

<a id="testing"></a>

## ۱۸. تست و کنترل کیفیت

دستورها از ریشه پروژه اجرا می‌شوند.

| بررسی          | دستور                                                      | نتیجه معتبر یا شواهد آخرین بررسی                                                                         |
| -------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Format         | npm run format:check                                       | PASS                                                                                                     |
| Lint           | npm run lint                                               | PASS با max-warnings=0                                                                                   |
| Typecheck      | npm run typecheck                                          | PASS                                                                                                     |
| Unit API و Web | npm run test:unit                                          | PASS؛ API پانزده و Web پنج تست                                                                           |
| Integration    | DATABASE_URL=... REDIS_URL=... npm run test:integration    | PASS؛ چهار فایل و چهار تست                                                                               |
| Build          | npm run build                                              | PASS؛ shared، API و Web                                                                                  |
| Prisma schema  | npx prisma validate --schema apps/api/prisma/schema.prisma | PASS                                                                                                     |
| Migration      | npm run db:migrate با DATABASE_URL ایزوله                  | PASS؛ ۱۲ migration                                                                                       |
| Compose syntax | docker compose config --quiet                              | PASS                                                                                                     |
| Browser E2E    | npm run test:e2e                                           | BLOCKED_EXTERNAL؛ هر ۱۶ تست پیش از assertion به‌دلیل نبود Chrome در /opt/google/chrome/chrome متوقف شدند |
| MinIO live     | اجرای کامل Compose و upload/signed URL                     | BLOCKED_EXTERNAL به‌دلیل registry                                                                        |
| Backup restore | مسیر restore به دیتابیس جدا                                | NOT_RUN؛ فایل backup واقعی تولید یا restore نشده است                                                     |

### پوشش integration مهم

آزمون‌های apps/api/test/integration این رفتارها را پوشش می‌دهند:

- محدودشدن درخواست شهر A به داروخانه‌های واجد شرایط شهر A و حذف شهر B یا داروخانه suspended
- پاسخ ناقص و جایگزین تأییدنشده که درخواست را نمی‌بندد
- ده پذیرش هم‌زمان و باقی‌ماندن دقیقاً یک winner، یک order و رزرو معتبر
- بی‌اعتبارشدن پاسخ revision یا round قدیمی
- retry اتمیک پس از لغو داروخانه و idempotency اجرای دوباره
- مقایسه پیش‌فاکتورها و تأیید یک‌باره بیمار
- طرح split با پوشش مقدار لازم هر قلم
- چرخه سفارش تا proof تحویل و rating
- OTP اشتباه، منقضی، purpose-bound، یک‌بارمصرف و محدودیت resend
- محدودشدن تاریخچه به profile احراز‌شده
- حفظ مسیر legacy بدون ساخت تحویل یا قلم ساختگی

آزمون‌های موجود Web نیز فرم عمومی، ناوبری، responsive، tracking ورودی نامعتبر و axe WCAG را بررسی می‌کنند. در اجرای فعلی، Vite test server بالا آمد اما هر ۱۶ تست پیش از اجرای assertion به‌دلیل نبود توزیع Chrome در مسیر /opt/google/chrome/chrome متوقف شدند؛ برای اجرای مجدد باید browser مورد انتظار Playwright نصب شود.

<a id="troubleshooting"></a>

## ۱۹. رفع مشکلات رایج

| مشکل                                                  | تشخیص                                                               | راه‌حل امن                                                                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| API با Invalid environment configuration بالا نمی‌آید | log نام متغیر یا شرط نامعتبر را نشان می‌دهد                         | JWTها، DATABASE_URL، REDIS_URL، S3_ENDPOINT، bucket و keyهای لازم را در .env تکمیل کنید؛ secret را چاپ یا commit نکنید                              |
| migrate خطای DATABASE_URL می‌دهد                      | Prisma از cwd workspace اجرا شده است                                | DATABASE_URL را در همان command یا shell export کنید و سپس db:migrate را اجرا کنید                                                                  |
| health پاسخ 503 می‌دهد                                | هر یک از PostgreSQL، Redis یا bucket storage در دسترس نیست          | docker compose ps، log سرویس‌ها و اتصال هر سه dependency را بررسی کنید؛ migration را روی دیتابیس واقعی reset نکنید                                  |
| پورت اشغال است                                        | 5432، 6379، 9000، 9001، 4000 یا 5173 آزاد نیست                      | پورت میزبان Compose را با POSTGRES_HOST_PORT، REDIS_HOST_PORT، MINIO_API_HOST_PORT یا MINIO_CONSOLE_HOST_PORT تغییر دهید و URL اتصال را هماهنگ کنید |
| MinIO بالا نمی‌آید                                    | Docker registry خطای pull access denied یا image unavailable می‌دهد | دسترسی registry یا mirror مجاز را اصلاح کنید؛ provider ساختگی یا URL عمومی دائمی ایجاد نکنید                                                        |
| Swagger دیده نمی‌شود                                  | SWAGGER_ENABLED=false یا endpoint اشتباه است                        | در توسعه SWAGGER_ENABLED=true و مسیر /docs را استفاده کنید؛ در production آن را عمومی نکنید                                                         |
| OTP ارسال نمی‌شود                                     | providerStatus برابر BLOCKED_EXTERNAL است                           | SMS provider رسمی و adapter/worker واقعی را در محیط مجاز وصل کنید؛ OTP را با bypass production دور نزنید                                            |
| فایل نسخه خوانده نمی‌شود                              | bucket یا S3_PUBLIC_ENDPOINT نادرست است                             | endpoint داخلی upload، endpoint امضای URL، credential و bucket policy خصوصی را بررسی کنید                                                           |
| صفحه پنل به login برمی‌گردد                           | access/refresh session معتبر نیست یا کاربر غیرفعال است              | دوباره login کنید، cookie/CSRF را بررسی کنید و از تغییر مستقیم نقش یا ID خودداری کنید                                                               |
| migration تکرار یا ناسازگار است                       | وضعیت migration و DATABASE_URL را بررسی کنید                        | migrate deploy را روی همان دیتابیس اجرا و وضعیت schema را بررسی کنید؛ migration فایل را بازنویسی یا reset نکنید                                     |

<a id="current-status"></a>

## ۲۰. وضعیت فعلی توسعه

این جدول تفکیک می‌کند چه چیزی برای توسعه محلی قابل استفاده است و چه چیزی پیش از بهره‌برداری واقعی نیازمند کار اضافه دارد.

| حوزه                          | اکنون قابل استفاده در کد                         | وضعیت تکمیل                                           |
| ----------------------------- | ------------------------------------------------ | ----------------------------------------------------- |
| ثبت بیمار و پیگیری تک‌درخواست | فرم RTL، اقلام ساختاریافته، publicId و token     | قابل استفاده و تست‌شده محلی                           |
| ارسال و پذیرش شهرمحور         | assignment شهری، پاسخ قلمی، تراکنش پذیرش و سفارش | قابل استفاده و تست‌شده با PostgreSQL محلی             |
| رقابت هم‌زمان                 | unique guard، conditional update و idempotency   | تست ۱۰ پذیرش هم‌زمان موفق                             |
| سفارش و تحویل حضوری           | status transition، رزرو، proof و rating          | تست‌شده محلی                                          |
| مقایسه و split                | quote، انتخاب بیمار، plan و child order          | API و تست اختیاری موجود؛ UI و سیاست عملیاتی کامل نیست |
| تاریخچه و خانواده             | OTP session، history و family access API         | API تست‌شده؛ رابط خانواده محدود                       |
| داروخانه و مدیریت             | registration، approval، RBAC، dashboard و audit  | رابط پایه موجود                                       |
| گزارش                         | JSON و CSV فیلترشده برای مدیر و داروخانه         | API موجود؛ Excel/alert/chart کامل نیست                |
| فایل نسخه                     | کنترل نوع/محتوا/حجم، رضایت و signed URL          | کد موجود؛ storage live در محیط فعلی تأیید نشده        |
| SMS و اعلان بیرونی            | challenge و outbox داخلی                         | اتصال واقعی موجود نیست                                |
| OCR، بیمه و نسخه الکترونیک    | مرز تنظیمات و مدل‌های داخلی                      | قرارداد و credential خارجی لازم است                   |
| نقشه و پیک                    | فیلدهای موقعیت و stateهای داخلی delivery         | provider واقعی و callback لازم است                    |
| MFA مدیر و restore            | زیرساخت‌های بخشی امنیت و backup script           | MFA کامل و restore rehearsal انجام نشده است           |

در نتیجه، وضعیت صحیح پروژه یک MVP توسعه‌یافته با مسیرهای اصلی و آزمون‌های محلی است، نه ادعای تکمیل همه اتصال‌های production. هر قابلیت خارجی باید پس از دریافت قرارداد و دسترسی رسمی دوباره آزموده و وضعیت آن جدا ثبت شود.

<a id="related-docs"></a>

## مستندات مرتبط

- [معماری پروژه](docs/architecture.md)
- [مدل داده و دیتابیس](docs/database.md)
- [قرارداد API](docs/api.md)
- [راهنمای deployment](docs/deployment.md)
- [Backup و Restore](docs/backup-restore.md)
- [گزارش امنیت](docs/security.md)
- [گزارش آزمون](docs/test-report.md)
- [برنامه پیاده‌سازی](docs/nooskheyab/implementation-plan.md)
- [پیشرفت و وضعیت قابلیت‌ها](docs/nooskheyab/progress.md)
- [سازگاری داده و API قدیمی](docs/nooskheyab/compatibility.md)
- [شواهد verification](docs/nooskheyab/verification.md)
- [اتصال‌ها و محدودیت providerها](docs/nooskheyab/integrations.md)

## مجوز و داده حساس

این repository شامل داده بیمار واقعی، credential واقعی provider، رمز حساب یا فایل درمانی نمونه نیست. فایل‌های .env، backup، log حساس و secretهای production باید خارج از Git نگه داشته شوند. برای شرایط حقوقی و مجوز انتشار، سیاست مالک پروژه را مبنا قرار دهید؛ فایل LICENSE در ریشه مخزن فعلی مشاهده نشد.
