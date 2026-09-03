# Architecture

The project is a modular npm-workspaces monorepo:

```text
apps/web (React + Vite + Capacitor)
        -> HTTPS/REST /api/v1
apps/api (NestJS)
        -> Prisma -> PostgreSQL
        -> Redis (rate limits, idempotency, locks, short cache)
        -> S3-compatible private storage (MinIO locally)
```

Uploads use the API's internal `S3_ENDPOINT`. Read access is authorized by the API and returned as a short-lived signed URL generated against `S3_PUBLIC_ENDPOINT`; in the production Compose example Nginx exposes the separate signed `storage.example.com` host and proxies it to the private MinIO service without rewriting the S3 path. `/health` checks PostgreSQL, Redis, and the configured storage bucket and still returns only a generic status.

`packages/types`, `packages/validation`, `packages/config`, `packages/api-client`, and `packages/ui` contain shared contracts, normalization/validation, configuration parsing, token-aware HTTP transport, and RTL design-system components. The API owns all authorization and state transitions.

The patient has no account. A prescription receives a random public identifier and a 32-byte random access token. Only a SHA-256 token hash is persisted in PostgreSQL. Pharmacy and admin access uses short-lived JWT access tokens tied to a revocable refresh session. Browser refresh uses an HttpOnly cookie plus CSRF token; native refresh uses the secure storage adapter.

The prescription domain service owns aggregation, expiry, response and selection transitions. Selection is protected by a conditional transactional update, so only one concurrent selection can succeed.

The web app is mobile-first, Persian RTL, uses local Vazirmatn, a restricted service worker shell cache, and no `server.url` in Capacitor production configuration. Android and iOS packages contain the React build through `webDir: dist`.
