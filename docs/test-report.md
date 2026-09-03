# Test Report

The executable validation surface is:

- shared validation and prescription status aggregation unit tests under `apps/api/test/unit`
- React unit tests under `apps/web/src/lib/*.test.ts`
- PostgreSQL/Redis integration flow under `apps/api/test/integration`
- Playwright public form and mobile/desktop browser projects under `apps/web/test/e2e`
- format, lint, strict typecheck, Prisma validation/generation, production build, Docker Compose config and Capacitor sync

Run the complete local gate with:

```bash
npm run format:check && npm run lint && npm run typecheck && npm run test:unit \
  && npm run test:integration && npm run build && npm run test:e2e && npm run cap:sync
```

The latest command-by-command evidence is kept in [TEST_REPORT.md](TEST_REPORT.md). Tests requiring a Docker daemon, CocoaPods, Xcode, or Android SDK are marked with their actual environment result rather than inferred as passing.
