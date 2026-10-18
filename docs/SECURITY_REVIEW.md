# Security Review

## UI redesign follow-up — 2026-10-18

The changed UI, shared components and API-client trust boundaries were reviewed for private-token handling, stale account caches, URL parsing, unsafe HTML, upload controls, logout failure handling and authorization regressions. The browser fetch binding and a parameterized UUID row-lock query were repaired and verified against real services. Patient status queries now isolate credential changes without putting credentials in query keys and discard inactive private query caches. Login/logout clear account caches; failed server logout is visible instead of being presented as success.

Capacitor Android/iOS were aligned to 7.6.9. Compatible targeted dependency updates installed `@nestjs/platform-express` 11.2.7, Multer 2.4.0 and proxy-addr 2.0.8. The final production audit still fails with five findings (three high, two moderate) in the existing Prisma/config/deepmerge-ts and Swagger/js-yaml chains. The full audit reports 22 findings, including development tooling (four critical, eleven high, seven moderate). These results are not a clean dependency audit or a production security certification. See [the redesign report](UI_REDESIGN_REPORT_FA.md) for executed checks and remaining native/deployment limits.

## Reviewed boundaries

The review covers public prescription creation/status/mutations, authentication and refresh sessions, pharmacy RBAC and tenant queries, admin routes, upload/storage access, validation/error handling, logging/audit, Redis use, Nginx/Compose configuration, PWA caching, and Capacitor transport/storage configuration.

## Controls present

- centralized DTO/Zod validation and digit normalization
- Iranian national-ID checksum validation
- Argon2id password hashing and common-password rejection
- access-token/session revocation and refresh rotation
- browser CSRF checks for cookie refresh/logout
- generic public token errors and constant-time token comparison
- conditional transaction for final pharmacy selection
- approved/active pharmacy guard and session-derived pharmacy tenant scope
- bounded temporary-file uploads with magic-byte/MIME checks, streaming SHA-256/S3 writes, private random S3 keys and short-lived signed URLs; production can sign against `S3_PUBLIC_ENDPOINT` while uploading through the internal endpoint
- redacted structured logs and append-only audit service
- Helmet, allowlisted CORS and external-link hosts, secure cookies, request limits, Multer 413/422 mapping, token-free Nginx access logs, trusted client IP forwarding, HTTPS-only production public endpoints, and Nginx headers
- versioned PWA shell caching limited to same-origin static assets; API responses and tokenized document navigations are not cached
- masked mobile values in admin list views; authorized detail routes are the explicit boundary for sensitive contact data

## Residual operational requirements

Production must supply real TLS, secret management/rotation, encrypted off-host backups, dependency scanning, alerting, and a successful signed native build verification. The implementation does not claim those external controls are configured by source code alone.
