# Deployment

## Development

```bash
cp .env.example .env
npm ci
docker compose up -d postgres redis minio minio-init
npm run db:migrate
npm run db:seed
npm run dev
```

The development Compose file exposes PostgreSQL, Redis, MinIO and the API/Web ports for local work. These credentials are development-only and must not be reused.

## Production Compose

```bash
cp .env.production.example .env.production
# Replace every replace-with-* value and set the real public URLs.
mkdir -p docker/nginx/certs
# Put fullchain.pem and privkey.pem in that directory.
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

The production file keeps PostgreSQL, Redis and MinIO on the internal Compose network, exposes only Nginx ports 80/443, waits for health checks, runs migrations before the API, and serves hashed web assets through Nginx. The static web container uses the unprivileged Nginx image and listens on internal port 8080; the edge Nginx proxies to that port. Nginx proxies `/api/`, `/health`, and optional `/docs` to the API. The API uploads through the internal `S3_ENDPOINT`; signed document URLs use `S3_PUBLIC_ENDPOINT`. The provided example uses the separate HTTPS host `storage.example.com`, which Nginx proxies to private MinIO without changing the signed path or host. DNS and the TLS certificate must cover that host. If an external S3-compatible service is used instead, set `S3_PUBLIC_ENDPOINT` to its HTTPS endpoint and configure the frontend external-host allowlist accordingly. `POSTGRES_PASSWORD`, the URL password, `REDIS_PASSWORD`, and MinIO/S3 credentials must be generated independently and managed outside Git.

## Capacitor

```bash
npm run build:web
npm run cap:sync
npm run cap:android
npm run cap:ios
```

`cap:android` and `cap:ios` open the native IDE. Release signing files and provisioning credentials stay outside the repository. Android cleartext traffic is disabled in the manifest and network-security XML; iOS uses the default ATS restrictions and no arbitrary-load exception. The iOS project uses the Capacitor SPM template and includes a local Keychain-backed `SecureStoragePlugin.swift` implementation in the App target, because the installed JavaScript plugin has no SPM package. The native Xcode build must still be run on a macOS host with the required SDK and signing configuration.

The `pharmacy-mvp://request/RX-XXXXXXXX?token=...` custom scheme is registered on Android and iOS, while the native application identifier remains `com.company.pharmacyprescription`. The web layer validates the host/path, accepts only the expected request identifier, stores the token through the patient-token adapter, and removes it from the visible URL. For production Universal Links/App Links, configure the final HTTPS domain, certificate, Android asset links, and iOS associated domains outside this repository; no final domain is invented here.

## Backup and restore

Use [backup-restore.md](backup-restore.md). A backup file alone is not a restore test; run the documented restore command against an isolated database.
