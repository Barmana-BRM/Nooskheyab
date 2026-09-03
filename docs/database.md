# Database

Prisma schema: `apps/api/prisma/schema.prisma`. Migrations are under `apps/api/prisma/migrations` and must be applied with `prisma migrate deploy`; production databases are not edited manually.

The schema contains users, pharmacies, private pharmacy documents, prescriptions, pharmacy assignments, pharmacy responses, insurance providers, append-only audit logs, refresh sessions, notifications, and pharmacy review history. Internal identifiers are UUIDs. PostgreSQL timestamps are UTC.

Important constraints include unique public prescription IDs and token hashes, one assignment and response per prescription/pharmacy pair, unique usernames/emails/mobile numbers, unique insurance name/type, role/pharmacy consistency checks, and supplementary-insurance consistency checks.

The seed is idempotent and creates the required base and supplementary insurance providers. An initial SUPER_ADMIN is created only when all `ADMIN_INITIAL_*` environment values are supplied and valid. No patient seed data is created.

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

The main list query paths have indexes for status/date/expiry, prescription search fields, pharmacy assignment status, insurance selection, users, and audit events. List endpoints cap limits at 100 and use pagination. The integrity migration replaces pharmacy-wide unique indexes with partial unique indexes for non-deleted pharmacies and adds a case-insensitive username index.
