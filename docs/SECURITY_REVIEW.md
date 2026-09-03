# Security Review

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
