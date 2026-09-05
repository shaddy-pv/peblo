# Peblo TV Mini

A production-grade streaming content pipeline built for the Peblo TV take-home assessment. Editorial staff manage shows, seasons, episodes, and artwork in an internal CMS; the FastAPI backend runs strict publish-readiness validations and compiles an atomic, denormalized catalogue; and children browse, search, and watch bilingual shows in a fast, Netflix-style viewer UI.

**GitHub**: [shaddy-pv](https://github.com/shaddy-pv)  
**Repository**: [https://github.com/shaddy-pv](https://github.com/shaddy-pv)

---

## Overview

Peblo TV Mini separates editorial mutations from high-concurrency viewer reads:
```
CMS (React 19 + TanStack Query)
       │ HTTP / REST (JWT Auth)
       ▼
FastAPI Backend (Python 3.13) ──► PostgreSQL 16 (Relational Source of Truth)
       │
       │ Atomic Publish Pipeline (Validation Gate + Temp-Write + POSIX Rename)
       ▼
catalogue.json in Storage (Local Disk / Cloudflare R2)
       │
       ▼ High-Speed Cacheable Read (Zero DB Queries)
Viewer UI (React 19)
```

1. **CMS**: Internal tool where editors upload content, inspect artwork aspect ratios, and monitor validation issues.
2. **FastAPI API**: Relational persistence, business rules, RBAC, and storage abstraction.
3. **Publish Pipeline**: Enforces validation blockers, collapses language variants (`content_group`), isolates Season 0 trailers, and atomically replaces `catalogue.json`.
4. **Viewer**: Public, zero-admin React application reading the published catalogue.

---

## Tech Stack

- **Frontend (CMS & Viewer)**: React 19, TypeScript, Vite, TanStack Query v5, Vanilla CSS design tokens.
- **Backend (API)**: Python 3.13, FastAPI, Pydantic v2, SQLAlchemy 2.0 (asyncio + asyncpg), Alembic, Pillow (image validation).
- **Database**: PostgreSQL 16 Alpine.
- **Storage**: Storage provider abstraction (`LocalStorageProvider` in dev, `R2StorageProvider` for Cloudflare R2 in production).
- **Authentication & Security**: OAuth2 password flow, JWT access tokens (`python-jose`), bcrypt password hashing (`passlib`).
- **Testing & Quality**: Pytest, pytest-asyncio, HTTPX, Ruff (linter/formatter), Oxlint, TypeScript strict mode.
- **Infrastructure**: Docker, Docker Compose, Nginx Alpine, GitHub Actions CI.

---

## Features

- **CMS Content Management**: Search, filter by status and section, pagination, and full CRUD for shows, seasons, and episodes.
- **Artwork Upload & Validation**: Dedicated slots for Poster (2:3 ~600×900), Banner (16:9 ~1280×720), and Thumbnail (16:9 ~640×360). Enforces the 200 KB ceiling, aspect ratio tolerances, and surfaces human-readable error messages for editors.
- **Role-Based Access Control (RBAC)**: Distinct `editor` (content CRUD + view report) vs `admin` (CRUD + publish catalogue) roles strictly enforced in backend middleware.
- **Automated Validation Engine**: Scans database for missing sections, missing durations, incomplete artwork, and duplicate variants. Distinguishes blocking issues from warnings.
- **Atomic Catalogue Publishing**: Compiles denormalized catalogue, writes to a temporary file, verifies JSON integrity, and executes an atomic OS-level rename.
- **Language Variant Collapsing**: Episodes sharing a `content_group` collapse into a single catalogue entry with English and Hindi (`en`/`hi`) language tracks.
- **Season 0 Trailer Separation**: Season 0 episodes are automatically excluded from normal seasons and surfaced as standalone trailers.
- **Netflix-Style Viewer**: Featured hero banner, horizontal section rails, bilingual language selector, composed search (query + category + language + section), and integrated video player.

---

## Running Locally

### 1. Clone & Start Stack
```bash
git clone https://github.com/shaddy-pv.git
cd peblo
cp .env.example .env
docker compose up --build
```

`docker compose up` automatically brings up PostgreSQL, applies Alembic migrations, loads the seed content and sample artwork, builds the frontend bundles, and starts all services.

### 2. Service URLs & Credentials
- **Viewer OTT App**: [http://localhost:3001](http://localhost:3001)
- **Internal CMS**: [http://localhost:3000](http://localhost:3000)
- **API Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health) (also available at `/api/v1/health`)

| Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full CRUD, view validation report, execute catalogue publish |
| **Editor (Staff)** | `editor` | `editor123` | Full CRUD, view validation report (publish disabled) |

### 3. Running Tests & Quality Checks
```bash
# Backend unit & integration test suite (102 tests)
docker exec peblo_api /home/peblo/.local/bin/pytest -v

# Backend linting
docker exec peblo_api /home/peblo/.local/bin/ruff check app/ tests/

# CMS lint & build
cd cms && npm run lint && npm run build

# Viewer lint & build
cd viewer && npm run lint && npm run build
```

---

## Operability & Monitoring

### Health Endpoint
- `GET /health` and `GET /api/v1/health` verify API service availability and run an active `SELECT 1` ping against PostgreSQL, returning database connectivity status and round-trip latency in milliseconds.

### Production Alert Recommendation: `PublishJobFailure`
- **Alert**: Trigger PagerDuty/Slack notification whenever `publish_runs.outcome == 'failed'` or `POST /admin/catalog/publish` returns HTTP 4xx/5xx.
- **Reasoning**: A failed publish indicates data integrity issues or storage sync errors blocking scheduled catalogue updates. Because viewers read the previously published snapshot, service is not interrupted, giving engineering time to resolve the issue before viewer experience is affected.

---

## Architecture & Key Design Decisions

### 1. Atomic Publishing
- **Mechanism**: The backend writes the denormalized catalogue JSON to a unique temporary file (`catalogue_tmp_{uuid}.json`), validates that the file is non-empty and valid JSON, flushes/syncs file buffers (`fsync`), and replaces the live destination via atomic OS rename (`temp_path.replace(live_path)`).
- **Crash Safety**: If the server crashes or runs out of memory during JSON generation or writing, the live `catalogue.json` remains completely untouched. Viewers never observe a truncated or corrupt file. The `PublishRun` state remains recorded in PostgreSQL for auditing.

### 2. Storage Abstraction
- Defined by the `StorageProvider` abstract base class (`app/storage/base.py`) with methods `upload`, `delete`, `exists`, `read`, and `get_public_url`.
- **Local Dev**: `LocalStorageProvider` writes to `/app/storage` served statically by FastAPI.
- **Production Migration to Cloudflare R2**: Set `STORAGE_BACKEND=r2` in environment variables with Cloudflare credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`). The factory `get_storage()` instantiates `R2StorageProvider` (`boto3` S3-compatible client). Zero application code changes are required.

### 3. Search Strategy & Scalability Boundaries
- **Current Take-Home**: In-memory composed filter (`CatalogueService.search_catalogue`) evaluated over the pre-compiled catalogue. Substring matching evaluates show titles, episode titles (across all language tracks), synopses, and categories, combined with section, category, and language filters.
- **Scale Limit**: Highly performant (< 3ms) up to ~1,000 shows (~10,000 episodes, ~2 MB JSON). Beyond 10,000 shows, linear CPU traversal and memory copying become bottlenecks under concurrent requests.
- **Production Evolution**:
  - *Phase 1 (10K–100K shows)*: PostgreSQL Full-Text Search using `tsvector` with GIN indexing and `pg_trgm` for typo tolerance.
  - *Phase 2 (100K+ shows)*: Dedicated search cluster (Meilisearch or OpenSearch) queried directly or via CDN edge workers.

### 4. Published Catalogue vs. DB-per-Request Tradeoff
- **Why Pre-Publish?**: Streaming reads outnumber editorial writes by 10,000:1. Pre-baking `catalogue.json` allows edge CDNs (Cloudflare/CloudFront) to cache responses globally, serving viewer traffic with sub-20ms latency and near-zero database load. Database outages or schema migrations never take down the viewer app.
- **Tradeoff / Downside**: Content updates are not immediate; editors must publish before changes reflect in the viewer. Dynamic user personalization (e.g., watch history, resume playback) cannot be baked into the static catalogue and must be served via separate lightweight microservices.

### 5. Intentional Omissions
- **Video Transcoding Pipelines**: Kept video streams as direct YouTube embeds / standard HTTPS video stubs rather than implementing complex multi-bitrate HLS/DASH transcoders.
- **Payment & User Subscriptions**: Focused entirely on content management and viewing experience per the assessment scope.
- **External Search Infrastructure**: Deprioritized hosting an external Elasticsearch/Meilisearch cluster in Docker Compose in favor of clean in-memory search to keep local setup fast and lightweight.

---

## AI Usage

AI-assisted development (Google DeepMind Antigravity) was used selectively for:
- Initial boilerplate scaffolding (Pydantic models, TypeScript type definitions, initial test mocks).
- Assistance in identifying edge cases in seed data flaws.
- Drafting initial UI component layout structures.

**Key Rejected / Corrected AI Outputs**:
1. *Unatomic Catalogue Writing*: Initial AI suggestions used standard file write (`open('catalogue.json', 'w')`). Rejected and rewritten with write-then-rename temp file pattern with POSIX atomic swap and integrity pre-check.
2. *PostgreSQL Enum Case Clashes*: AI generated Python Enum members with uppercase strings which conflicted with PostgreSQL lowercase enum definitions. Corrected with `values_callable` mappings.
3. *Search Query Route Duplication*: AI proposed querying the relational database for search and static file for browse. Rejected to preserve zero-database reader isolation; unified search to run against the published catalogue.

---

## Time Spent

**Total Time: ~8 hours**

- **Part A — Backend Core & Publishing Engine**: ~3.0 hours  
  *(FastAPI domain schema, Alembic migrations, Pillow artwork validation, atomic write-then-rename publish pipeline, RBAC middleware, and validation engine)*
- **Part B — Internal CMS**: ~2.0 hours  
  *(React 19, TanStack Query, artwork upload slots with aspect ratio & 200 KB enforcement, publish readiness report, and run history)*
- **Part C — Viewer OTT Experience**: ~1.5 hours  
  *(Netflix-style hero/section rails, bilingual language variant collapsing, Season 0 trailer isolation, composable search, and video player)*
- **Part D — Operability, CI/CD & Docker**: ~1.0 hour  
  *(Multi-container Docker Compose with health checks, Alembic seed orchestrator, GitHub Actions CI workflow, and environment configuration)*
- **Part E — Testing & Documentation**: ~0.5 hour  
  *(102-test pytest suite, ruff/oxlint verification, and architectural trade-off documentation)*

---

## Submission Checklist

- [x] Repository builds successfully (`docker compose build` & frontend builds pass)
- [x] Docker Compose brings up complete stack with single command (`docker compose up --build`)
- [x] PostgreSQL initializes with clean Alembic migrations and seed data
- [x] Internal CMS functional with search, filters, pagination, and upload slots
- [x] Viewer UI functional with hero, section rails, search, and show details
- [x] Role-Based Access Control enforced (Editor blocked from publishing with HTTP 403)
- [x] Artwork validation enforces 3 sizes, aspect ratios, and 200 KB ceiling
- [x] Validation report surfaces blocking issues and warnings with actionable guidance
- [x] Catalogue publishing verified atomic and crash-resilient
- [x] Language variants sharing `content_group` collapse into unified entries
- [x] Season 0 trailers isolated from regular seasons
- [x] Composable search & filtering operational
- [x] Backend test suite passing (102/102 tests pass)
- [x] Frontend and backend linters passing (0 errors, 0 warnings)
- [x] GitHub Actions CI workflow configured for lint, test, and image build
- [x] `.env` is ignored by git; `.env.example` is complete and documented
- [x] Health check endpoint operational (`GET /health` and `GET /api/v1/health`)
- [x] Concise 1-page README completed with architectural decisions
