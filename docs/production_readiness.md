# Peblo TV Mini — Production Readiness & Operations Manual

This document details the operational architecture, security posture, alerting guidelines, and cloud infrastructure deployment for the **Peblo TV Mini** platform.

---

## 1. Secrets Management & Environment Security

### Principle of Least Privilege
- **Never commit `.env` files**: All secrets, credentials, and tokens must remain excluded via `.gitignore`.
- **Rotational Secrets**:
  - `SECRET_KEY`: Rotated quarterly or immediately upon staff turnover. Use `openssl rand -hex 32` to generate high-entropy 256-bit keys.
  - `DATABASE_URL`: In production environments, use short-lived credential brokering (e.g., AWS IAM database authentication or HashiCorp Vault dynamic PostgreSQL secrets).
  - Cloudflare R2 API Tokens: Scoped strictly to `Object Read & Write` permissions on the `peblo-media` bucket only (do not use Global API Keys).

### Recommended Production Providers
| Environment | Recommended Secret Manager | Integration Method |
|---|---|---|
| **AWS / ECS / EKS** | AWS Secrets Manager / Parameter Store | IAM Role-based container task injection |
| **Kubernetes** | External Secrets Operator + HashiCorp Vault | Kubernetes Secret synchronization |
| **PaaS (Fly / Railway / Render)** | Platform Native Secrets | Encrypted at rest, injected as runtime ENV |
| **CI / CD (GitHub Actions)** | GitHub Encrypted Secrets & Environments | Injected only during protected `deploy` workflow runs |

---

## 2. Cloudflare R2 Storage Migration Playbook

The storage layer uses an abstract provider interface (`StorageProvider`). Migrating from local disk storage to Cloudflare R2 requires **zero code changes**—only environment configuration.

### Migration Steps

1. **Create Cloudflare R2 Bucket**:
   - Log into Cloudflare Dashboard → **R2 Object Storage**.
   - Create a bucket: `peblo-catalogue-prod`.
   - Set bucket jurisdiction or location hint (e.g., `apac` or `weur`).

2. **Generate S3-Compatible API Credentials**:
   - Navigate to **Manage R2 API Tokens** → **Create API Token**.
   - Permissions: `Object Read & Write`.
   - Specify bucket: `peblo-catalogue-prod`.
   - Copy:
     - `Account ID`
     - `Access Key ID`
     - `Secret Access Key`

3. **Configure Custom Public Domain & CDN Caching**:
   - Under bucket settings, attach a custom domain: `media.peblo.tv`.
   - Enable Cloudflare Cache Rules:
     - `/artwork/*`: Edge Cache TTL = 30 days (`Cache-Control: public, max-age=2592000, immutable`).
     - `/catalogue.json`: Edge Cache TTL = 60 seconds (`Cache-Control: public, max-age=60, s-maxage=300`).

4. **Update Production Environment Variables**:
   ```env
   STORAGE_BACKEND=r2
   R2_ACCOUNT_ID="your_cloudflare_account_id"
   R2_ACCESS_KEY_ID="your_r2_access_key"
   R2_SECRET_ACCESS_KEY="your_r2_secret_access_key"
   R2_BUCKET_NAME="peblo-catalogue-prod"
   R2_PUBLIC_URL="https://media.peblo.tv"
   ```

5. **Data Sync (One-Time Backfill)**:
   Use `rclone` or AWS CLI with R2 endpoint to sync historical assets:
   ```bash
   aws s3 sync ./storage s3://peblo-catalogue-prod/ \
     --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   ```

6. **Verify Dynamic Rollover**:
   - Trigger a publish from CMS.
   - Verify `PublishService` uploads `catalogue.json` directly to R2 bucket.
   - Verify Viewer loads catalogue and artwork from `https://media.peblo.tv`.

---

## 3. Health Checks & Alerting Matrix

### System Health Endpoints
- **Liveness Probe**: `GET /api/v1/health`
  - Validates API process responsiveness.
  - Verifies database connectivity (`SELECT 1`).
  - Response time target: `< 15ms`.
  - HTTP 200: Healthy, HTTP 503: Unhealthy.

### Alerting Policies & Thresholds

| Alert Name | Severity | Condition | Target / Channel | Remediation Action |
|---|---|---|---|---|
| **Database Connection Failure** | P0 (Critical) | `/health` returns 503 for > 1 min | PagerDuty / On-call engineer | Check PostgreSQL connection pool exhaustion, pod restarts, disk full |
| **Atomic Publish Failure** | P1 (High) | `publish_runs` record with outcome `FAILED` | Slack `#alerts-ops` + Email | Inspect `error_message` in `publish_runs`, verify disk space in `CATALOGUE_DIR`, check R2 credentials |
| **Catalogue Publish Stale / Crash** | P1 (High) | `publish_runs` status `RUNNING` for > 5 min | Slack `#alerts-ops` | Dead worker recovery: mark stale run as failed, clear lock, restart worker |
| **Flaw Blocker Spike** | P2 (Warning) | Validation Report blockers count > 0 for > 24h | Slack `#content-team` | Notify editorial team to resolve missing artwork or unassigned sections before release window |
| **Storage Quota Warning** | P2 (Warning) | Local disk usage > 80% or R2 egress spike | Slack `#infra-alerts` | Trigger asset lifecycle pruning or transition cold backups |

---

## 4. Database Scaling & Disaster Recovery

1. **Connection Pooling**:
   - Production FastAPI uses `asyncpg` with a pooled connection engine (`pool_size=20`, `max_overflow=10`).
   - For horizontal API scaling (> 10 replicas), deploy **PgBouncer** in transaction pooling mode in front of PostgreSQL.

2. **Automated Backups**:
   - Daily full logical dump: `pg_dump -Fc peblo_tv > backup_$(date +%Y%m%d).dump`.
   - Continuous WAL archiving to object storage (point-in-time recovery target: RPO < 5 minutes, RTO < 15 minutes).

3. **Zero-Downtime Migration Policy**:
   - Always write backwards-compatible Alembic migrations.
   - Step 1: Add new nullable columns or tables.
   - Step 2: Deploy new application code.
   - Step 3: Backfill data.
   - Step 4: Add NOT NULL constraints or drop deprecated columns in follow-up migration.
