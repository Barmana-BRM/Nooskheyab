# Security

- Global Nest validation uses whitelist, transform and `forbidNonWhitelisted`; DTOs and shared Zod schemas validate at both boundaries.
- Persian and Arabic digits are normalized before mobile, national-ID and postal-code checks. Iranian national-ID checksum validation is shared and Backend-authoritative.
- Passwords use Argon2id. Common passwords are rejected. Access tokens are memory-only in the browser; native refresh tokens use Keychain/Keystore through the storage adapter.
- Public patient tokens are 32 random bytes; the database stores only SHA-256 hashes, while a short-lived Redis idempotency record can retain the exact prior response for a bounded retry. Tokens are compared in constant time, never placed in audit metadata, and removed from the URL after handoff. Invalid public ID/token responses are generic.
- RBAC, approved-pharmacy checks, active-user checks, UUID parsing and pharmacy-scoped queries protect tenant boundaries. A suspended or unapproved pharmacy cannot use operational endpoints.
- Prescription selection is a conditional transaction and returns conflict on a race. Expiry is checked by the scheduler and synchronously by mutation/read paths.
- Redis keys are project-prefixed and TTL-bound. Rate limits cover login, patient creation/status/mutations, pharmacy registration and uploads. Redis failure is fail-open for availability; database writes remain authoritative and no critical data is stored only in Redis.
- Uploads are capped, MIME and magic-byte checked, restricted to JPEG/PNG/PDF, stored under random private S3 keys, hashed, and exposed only through short signed URLs after authorization. Original names are sanitized metadata.
- Helmet, CORS allowlists, request-size limits, CSRF protection for browser cookie refresh/logout, secure cookie flags in production, Nginx security headers, HTTPS redirect, and a versioned shell-only Service Worker cache (never API or tokenized document responses) are configured.
- Structured logs omit request bodies, Authorization, query tokens, passwords and patient PII. Audit metadata is redacted and audit rows are append-only from the application surface.

Before production, configure real TLS, secret rotation, external backup encryption, edge WAF/rate limits, dependency scanning and operational alerting. See [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for the repository review record.
