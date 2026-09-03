# API Contract

All versioned API responses are wrapped as `{ success, data, requestId }`; errors are `{ success: false, error: { code, message, fields? }, requestId }`. `GET /health` intentionally returns the minimal public health object.

## Public patient

```text
GET  /api/v1/insurance/base
GET  /api/v1/insurance/supplementary
POST /api/v1/prescriptions
GET  /api/v1/prescriptions/:publicId
POST /api/v1/prescriptions/:publicId/select-pharmacy
POST /api/v1/prescriptions/:publicId/cancel
POST /api/v1/prescriptions/:publicId/complete
```

Status and mutations require `X-Prescription-Token`. Creation accepts `Idempotency-Key` and returns the raw token only in the creation response.

## Authentication

```text
POST /api/v1/auth/login
GET  /api/v1/auth/csrf
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

Access tokens are short-lived. Refresh tokens are rotated, hashed in `RefreshSession`, and revoked on logout, disable, and password reset.

## Pharmacy and admin

Pharmacy registration, document, status, profile, dashboard, request, response, history and notification routes are implemented under `/api/v1/pharmacy`. Admin dashboard, prescription detail, registration review, pharmacy CRUD/soft-delete/suspend/reactivate, user management, insurance management and audit-log routes are implemented under `/api/v1/admin`. Prescription list routes accept bounded `status`, `page`, `limit`, `dateFrom`, `dateTo`, `search`, and `sort=newest|oldest` filters. Pharmacy IDs are taken from the authenticated user and never trusted from request body/query for tenant operations.

Swagger is available at `/docs` only when enabled by configuration. In production it should remain disabled or be protected at the edge.

Audit logs support bounded filters for `action`, `entityType`, `actor`, `requestId`, `dateFrom`, `dateTo`, `page`, and `limit`; the actor filter matches a username and the result metadata is already redacted by the append-only audit service.
