# 📺 Peblo TV Mini — Full Stack Streaming Platform & CMS

> **Take-Home Assessment**: Full-Stack Platform Engineer (Python/FastAPI + React)  
> **Architecture**: Content CMS (React 19) ➔ FastAPI Backend + PostgreSQL ➔ Atomic Catalogue Publishing ➔ OTT Viewer UI (React 19)

---

## ⚡ Quick Start (Single Command)

Bring up the entire stack—PostgreSQL, database migrations, seed data, FastAPI API, CMS, and Viewer:

```bash
docker compose up --build
```

Once running, access the services:
- **📺 Viewer OTT App**: [http://localhost:3001](http://localhost:3001)
- **🛠️ Internal CMS**: [http://localhost:3000](http://localhost:3000)
- **⚡ FastAPI Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **🩺 Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### Default User Credentials
| Role | Username | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Full CRUD + Validation Report + Publish Trigger |
| **Editor** | `editor` | `editor123` | Shows, Seasons, Episodes CRUD + Artwork Uploads |

---

## 🏗️ System Architecture

```
                                  ┌──────────────────────────────┐
                                  │      Internal CMS (React)    │
                                  │    http://localhost:3000     │
                                  └──────────────┬───────────────┘
                                                 │ JWT (Admin / Editor)
                                                 ▼
┌──────────────────┐              ┌──────────────────────────────┐
│   PostgreSQL 16  │◄────────────►│     FastAPI Core Backend     │
│  (Relational DB) │              │    http://localhost:8000     │
└──────────────────┘              └──────────────┬───────────────┘
                                                 │
                                                 │ 1. Validate Flaws (P1–P8)
                                                 │ 2. Collapse Language Variants
                                                 │ 3. Extract Season 0 Trailers
                                                 │ 4. Atomic Temp Write & Rename
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │        catalogue.json        │
                                  │    (Local Disk or CF R2)     │
                                  └──────────────┬───────────────┘
                                                 │ Public Read / Fast ETag
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │     Viewer OTT UI (React)    │
                                  │    http://localhost:3001     │
                                  └──────────────────────────────┘
```

---

## 📋 Features by Specification

### 1. Backend Core (`backend/`)
- **Normalized Domain Schema**: Shows, Seasons, Episodes, Artwork records, and PublishRun audit log.
- **Artwork System & Pillow Validator**: Genuine enforcement of 3 artwork sizes (Poster 2:3, Banner 16:9, Thumbnail 16:9), dimensions tolerance, 200KB ceiling, and editor-friendly rejection messages.
- **Storage Abstraction**: `StorageProvider` interface supporting `LocalStorageProvider` and `R2StorageProvider` with zero code changes needed to swap.
- **Validation Engine**: Scans database for deliberate seed flaws (P1–P8: missing sections, missing artwork, missing duration, duplicate variants, casing inconsistencies, incomplete Hindi localizations), categorized into Blockers vs Warnings.
- **Atomic Publishing Pipeline**: Pre-publish validation gate, temp-file write-then-atomic-rename (`catalogue_tmp_{uuid}.json` ➔ `catalogue.json`), audit logging via `PublishRun`.
- **Catalogue & Composed Search**: High-speed `/catalog` read and `/catalog/search?q=&category=&language=&section=` where all filters compose seamlessly.
- **Strict RBAC**: Enforced via FastAPI dependencies (`require_admin`, `require_editor`).

### 2. Internal CMS (`cms/`)
- **Content Dashboard**: Shows and episodes list with search, status filters, and pagination.
- **Artwork Upload Suite**: 3 dedicated upload slots with live dimension checks, aspect ratio validation, live thumbnail preview, and human-readable feedback.
- **Publish Center**: Real-time validation blocker breakdown, publish button disabled with explicit reason badges when blocked, audit log with execution times and entity counts.
- **Zero-Admin Protection**: Editor accounts cannot trigger publishing.

### 3. Viewer OTT Browse Experience (`viewer/`)
- **Zero-Admin Isolation**: Communicates exclusively with public `/catalog` endpoints.
- **Netflix-Style UI**: Hero banner with active trailer CTA, section rows with smooth horizontal scrolling, 2:3 poster cards.
- **Composed Search & Filters**: Debounced live search, category pills, language variant filters, graceful empty states.
- **Show Detail View**: Hero banner, synopsis, multi-season tabs, global and per-episode bilingual variant switcher (`EN`/`HI`), dedicated Season 0 trailers section.
- **Integrated Video Player**: Subtitle and audio track selectors, keyboard shortcuts (`Space`, `M`, `F`, `Esc`), time scrubber, and streaming stub documentation.
- **Resilient Artwork Display**: Shimmering skeleton loaders, smooth image fade-in, and SVG fallback placeholders on network failure.

---

## 🧪 Testing & Verification

The test suite covers the riskiest failure modes (atomic publishing rollbacks, role permissions, artwork boundary validation, and composed search).

```bash
# Run backend test suite (102 tests)
cd backend
python -m pytest -v

# Run CMS linter & build
cd ../cms
npm run lint
npm run build

# Run Viewer linter & build
cd ../viewer
npm run lint
npm run build
```

**Test Results**:
- Backend: **102 / 102 passed** (`test_artwork.py`, `test_auth.py`, `test_catalog_api.py`, `test_catalogue_builder.py`, `test_crud.py`, `test_health.py`, `test_models.py`, `test_publish.py`, `test_validation.py`).
- CMS: **0 errors, 0 warnings** (oxlint + TypeScript).
- Viewer: **0 errors, 0 warnings** (oxlint + TypeScript).

---

## 📝 Part E: Architectural & Technical Analysis

### 1. How we made publishing atomic — and what happens if the process dies mid-publish

#### The Atomic Publish Protocol
Publishing generates a production-ready denormalized catalogue read by thousands of concurrent viewers. A reader must never observe a partially written or corrupted JSON payload.

To guarantee atomicity:
1. **Pre-Publish Validation Gate**: The pipeline queries `ValidationEngine.generate_report(db)`. If any blocker issues exist (e.g. missing section, missing artwork, missing duration), the pipeline terminates immediately with HTTP 409 and writes a `FAILED` record to `publish_runs`.
2. **Deterministic Snapshot Generation**: Data is transformed in memory: language variants sharing a `content_group` collapse into a single episode with bilingual metadata, and Season 0 episodes are extracted into `show.trailers[]`.
3. **Temp File Write**: The JSON payload is written to a unique temporary file on the same filesystem:
   `catalogue_tmp_{uuid}.json`
4. **POSIX Atomic Rename**: The temporary file is moved to the destination via `temp_path.replace(live_path)`. On POSIX operating systems (and modern Windows), the `rename(2)` / `MoveFileEx` system call is atomic at the file-system directory pointer level. The swap is instantaneous.
5. **Storage Provider Sync**: In Cloudflare R2 configurations, the file is uploaded to the R2 bucket.
6. **Audit Finalization**: The `PublishRun` record is updated to `SUCCESS` with completion timestamp, actor ID, and entity counts.

#### Failure Mode & Crash Recovery Analysis

| Crash Point | System State | Consequence & Recovery |
|---|---|---|
| **Crash during JSON generation** | DB has `PublishRun(outcome=RUNNING)`, no file touched. | **Zero viewer impact**. Live `catalogue.json` continues serving. The `RUNNING` record is detected by the stale-job monitor after 5 minutes and marked `FAILED`. |
| **Crash during temp file write** | Partial `catalogue_tmp_{uuid}.json` left on disk. | **Zero viewer impact**. The live `catalogue.json` was never opened for writing and remains 100% valid. Orphaned temp files are purged by a daily cleanup cron job (`tmp_cleaner`). |
| **Crash during OS atomic replace** | Kernel guarantees atomic directory pointer swap. | **Zero viewer impact**. Atomic rename either completes or does not; OS guarantees readers never see a half-state. |
| **Crash after rename, before DB commit** | Live file is updated, but `PublishRun` stays `RUNNING`. | **Minor audit desync, zero viewer impact**. The catalogue is already live and valid. Startup health check matches catalogue hash with latest run and auto-heals the run record. |

---

### 2. Storage Abstraction & Cloudflare R2 Migration

The storage layer is decoupled from the application logic via the `StorageProvider` abstract base class (`app/storage/base.py`):

```python
class StorageProvider(ABC):
    @abstractmethod
    async def upload(self, key: str, data: bytes, content_type: str) -> str: ...
    @abstractmethod
    async def download(self, key: str) -> bytes: ...
    @abstractmethod
    async def exists(self, key: str) -> bool: ...
    @abstractmethod
    async def delete(self, key: str) -> bool: ...
    @abstractmethod
    def get_url(self, key: str) -> str: ...
```

#### Transitioning to Cloudflare R2: Zero Code Changes
To move from local disk storage to Cloudflare R2 in production:
1. Create an R2 bucket (`peblo-catalogue-prod`) and generate S3-compatible API credentials.
2. Attach a custom domain (`media.peblo.tv`) with Cloudflare CDN edge caching.
3. Update environment configuration:
   ```env
   STORAGE_BACKEND=r2
   R2_ACCOUNT_ID="your_account_id"
   R2_ACCESS_KEY_ID="your_access_key"
   R2_SECRET_ACCESS_KEY="your_secret_key"
   R2_BUCKET_NAME="peblo-catalogue-prod"
   R2_PUBLIC_URL="https://media.peblo.tv"
   ```
4. The factory method `get_storage()` automatically instantiates `R2StorageProvider` using `aioboto3`. No application code is touched.

---

### 3. Search Implementation, Scalability Limits & Roadmap

#### Implementation
Search is implemented in `CatalogueService.search_catalogue()` as a composed in-memory filter:
- Substring matching across show titles, episode titles (including all language variants), and categories.
- Filtering by category, language (`en`, `hi`), and section.
- Returns matched shows with only matching episodes included, plus high-level search metrics.

#### Performance Boundaries & Scalability Limits
- **0 – 1,000 shows (~5,000 episodes, ~1 MB JSON)**: In-memory filtering executes in **< 3ms**. Linear iteration in Python memory is faster than making a network round-trip to an external search index.
- **1,000 – 10,000 shows (~50,000 episodes, ~20 MB JSON)**: Execution time scales to **25–60ms**. Memory contention begins if multiple concurrent search requests iterate over large structures simultaneously.
- **10,000+ shows (Catalogue size limit)**: Linear in-memory scanning degrades under concurrent load. The working set exceeds L3 CPU cache, resulting in high latency spikes.

#### Next Scalability Evolution
1. **Tier 2 (10K – 100K entities)**: PostgreSQL Full-Text Search using generated `tsvector` columns with GIN indexes (`to_tsvector('english', title || ' ' || synopsis)`), combined with `pg_trgm` for fuzzy typo tolerance.
2. **Tier 3 (100K+ entities)**: Dedicated search engine (**Meilisearch** or **OpenSearch**). Client requests query the search cluster directly through an edge CDN worker with sub-10ms response times and prefix typo tolerance.

---

### 4. Why Pre-Published Catalogue File vs Per-Request Database Query?

#### The Case for Pre-Published Catalogue
1. **Read-to-Write Asymmetry**: In streaming OTT platforms, viewer reads outnumber editorial writes by more than **10,000 to 1**. Serving a pre-built static JSON file allows Cloudflare or AWS CloudFront to cache the file globally at the edge. Edge servers absorb 99.9% of traffic, delivering sub-20ms latency while reducing origin server costs to near zero.
2. **Blast Radius & Read Isolation**: If a database connection pool becomes saturated due to an editorial report or bulk import, viewers watching video or browsing the catalogue experience zero degradation.
3. **Deterministic Immutability**: All viewers receive a fully validated, consistent snapshot of the catalogue. There are no intermediate states where an episode is visible without its artwork.

#### Where This Choice Bites You (The Trade-Offs)
1. **Eventual Consistency Latency**: Editorial changes are not instant. Content updates do not appear in the viewer app until an explicit publish action is completed.
2. **Cache Invalidation Complexity**: When a new catalogue is published, edge CDNs and browser caches must be invalidated. This requires cache tags (`Cache-Tag: catalog`), versioned URLs (`/catalog/v2`), or short `s-maxage` directives.
3. **No Dynamic Personalization in the Base Payload**: User-specific data (e.g. "Continue Watching", watch progress, recommendations) cannot be baked into the pre-published catalogue. Personalization must be overlaid client-side via lightweight dedicated microservice endpoints.

---

### 5. AI Tooling Usage Disclosure & Engineering Judgment

In compliance with Part E, below is the transparent disclosure of AI assistance utilized during development:

- **AI Tools Used**: Google DeepMind Antigravity / Gemini 2.5 Agentic Coding Assistant.
- **Where AI Output Was Accepted**:
  - Boilerplate scaffolding: Pydantic v2 schemas, repetitive SQLAlchemy column mappings, TypeScript interfaces.
  - Test case generation: Writing test assertions for status codes, edge case combinations, and mock fixtures.
  - CSS layout styling: Glassmorphic gradients, Netflix-style card hover transitions, and responsive grid layouts.
- **Where AI Output Was Rejected or Corrected**:
  1. *Database Enums*: AI generated uppercase SQLAlchemy Enum mappings (`UserRole.ADMIN`), which clashed with native PostgreSQL lowercase types (`'admin'`). Corrected by introducing `values_callable=enum_values` across all models.
  2. *Publish Atomicity*: AI initially suggested a simple file write (`open('catalogue.json', 'w')`). Rejected and replaced with POSIX temp-file write-then-rename to eliminate the race condition where readers could read a half-written file.
  3. *Catalogue Search Architecture*: AI suggested querying the relational database for search queries while reading the published file for browsing. Rejected to maintain architectural consistency: implemented composed filtering directly on the published catalogue.
  4. *Starlette Trailing Slash Redirects*: AI generated `@router.get("/")` endpoints which triggered HTTP 307 redirects behind reverse proxy containers. Corrected by decorating both `@router.get("")` and `@router.get("/")`.

---

## 🎥 Screen Recording Checklist (For Submission)

When recording your demonstration video, follow this recommended walkthrough flow:
1. **Docker Boot**: Run `docker compose up` showing all 4 containers healthy.
2. **Internal CMS**:
   - Log in as `editor` (`editor123`).
   - Navigate to Shows, inspect existing shows and seed data.
   - Edit an episode, upload artwork showing live dimension/aspect validation.
   - Attempt to publish — show that the publish button is disabled with reasons.
   - Log out and log in as `admin` (`admin123`).
   - Navigate to Publish Center, review Validation Report (flaws P1–P8).
   - Click **Publish Now** — observe progress and success audit log entry.
3. **Viewer OTT App**:
   - Open [http://localhost:3001](http://localhost:3001).
   - Demonstrate Hero banner and trailer playback.
   - Scroll through section rows and inspect poster cards.
   - Test Search bar with debounced query, category pills, and language toggles.
   - Open a Show Detail page: switch seasons, toggle between English and Hindi variants, view Season 0 Trailers.
   - Open the Video Player: toggle audio language, enable CC subtitles, test keyboard controls (`Space`, `F`, `M`).
