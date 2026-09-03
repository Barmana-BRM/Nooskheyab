# Backup and Restore

`docker/postgres/backup.sh` creates PostgreSQL custom-format dumps with UTC timestamps and removes dumps older than seven days by default. In production, mount an encrypted backup destination outside the database volume and run it daily through a scheduler.

Example from a running PostgreSQL container:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  sh -c 'POSTGRES_USER="$POSTGRES_USER" POSTGRES_DB="$POSTGRES_DB" BACKUP_DIR=/backups /usr/local/bin/backup.sh'
```

Restore into an isolated PostgreSQL instance, never over the live database without a reviewed change window:

```bash
pg_restore --clean --if-exists --no-owner \
  --dbname="$DATABASE_URL" /backups/pharmacy_mvp-YYYYMMDDTHHMMSSZ.dump
```

After restore, run `npm run db:migrate`, `npm run db:generate`, a read-only health check, and the integration suite against the isolated database. Keep backup encryption keys separate from the storage location and verify retention and restore alerts operationally.
