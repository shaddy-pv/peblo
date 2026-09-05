# Peblo TV Mini — Phase 0: Project Audit & Implementation Plan

## Audit Summary

### Repository State

| Item | Finding |
|---|---|
| Repository | **Greenfield** — completely empty directory, no `.git`, no files |
| Git history | None |
| Existing code | None |
| Existing config | None |
| Existing assets | None |
| Existing seed data | None |

**Conclusion:** This is a full greenfield implementation. Every file must be created from scratch.

---

### Toolchain Available on Host

| Tool | Version | Status |
|---|---|---|
| Node.js | v24.13.0 | ✅ Ready |
| npm | 11.6.2 | ✅ Ready |
| Python | 3.13.1 | ✅ Ready |
| pip | 26.0.1 | ✅ Ready |
| Docker | 28.4.0 | ✅ Ready |
| Docker Compose | v2.39.4 | ✅ Ready |

### Pre-installed Python Packages (global)

| Package | Version |
|---|---|
| pydantic | 2.10.4 |
| pydantic_core | 2.27.2 |

> **Note:** FastAPI, SQLAlchemy, Alembic, pytest, uvicorn are NOT pre-installed globally. They will be managed via `requirements.txt` and the Docker environment (or a local venv for dev).

---

## Architectural Decisions

### Repository Layout (Monorepo)

```
peblo/
├── backend/               # FastAPI application
│   ├── app/
│   │   ├── api/           # Route handlers (thin controllers)
│   │   ├── core/          # Config, security, dependencies
│   │   ├── db/            # SQLAlchemy models, session
│   │   ├── schemas/       # Pydantic schemas (request/response)
│   │   ├── services/      # Business logic layer
│   │   ├── storage/       # Storage abstraction + providers
│   │   └── migrations/    # Alembic
│   ├── tests/
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── Dockerfile
├── cms/                   # React + TypeScript CMS
│   ├── src/
│   │   ├── api/           # API client (admin endpoints only)
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route-level pages
│   │   ├── hooks/         # TanStack Query hooks
│   │   ├── types/         # TypeScript interfaces
│   │   └── utils/
│   ├── package.json
│   └── Dockerfile
├── viewer/                # React + TypeScript Viewer
│   ├── src/
│   │   ├── api/           # Catalog API ONLY (no admin endpoints)
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── .github/
│   └── workflows/
│       └── ci.yml
└── README.md
```

---

### Technology Selections

#### Backend
| Concern | Choice | Rationale |
|---|---|---|
| Framework | FastAPI | Specified in requirements |
| ORM | SQLAlchemy 2.x (async) | Modern, async-native, widely supported |
| Migrations | Alembic | Specified in requirements |
| Validation | Pydantic v2 | Bundled with FastAPI, already available |
| Auth | JWT (python-jose) + bcrypt | Stateless, well-understood, no extra infra |
| Image validation | Pillow | Server-side image dimension/ratio/size checks |
| Testing | pytest + httpx (async) | Specified; httpx needed for async FastAPI testing |
| DB driver | asyncpg | Async PostgreSQL driver for SQLAlchemy async |
| ASGI server | Uvicorn | Standard for FastAPI |

#### Frontend (Both CMS and Viewer)
| Concern | Choice | Rationale |
|---|---|---|
| Framework | Vite + React + TypeScript | Fast DX, modern, appropriate for SPA |
| Server state | TanStack Query v5 | Specified in requirements |
| Routing | React Router v6 | Standard, well-understood |
| HTTP client | Axios | Typed, interceptor support for auth headers |
| Styling | Vanilla CSS (CSS Modules or global design tokens) | Specified in requirements |
| Forms | React Hook Form | Lightweight, performant, no unnecessary deps |

#### Infrastructure
| Concern | Choice | Rationale |
|---|---|---|
| Database | PostgreSQL 16 | Specified |
| Storage (local) | Local disk / Docker volume | Simple dev setup; abstracted |
| Storage (prod) | Cloudflare R2 (abstracted) | Specified |
| Container | Docker + Docker Compose | Specified |
| CI | GitHub Actions | Specified |

---

### Data Model Overview

```
users
  ├── id, username, hashed_password, role (EDITOR|ADMIN)

shows
  ├── id, title, synopsis, section, status (DRAFT|PUBLISHED)
  ├── category, language_default, created_at, updated_at

seasons
  ├── id, show_id (FK), season_number, title
  │     (season_number=0 → trailers bucket)

episodes
  ├── id, season_id (FK), episode_number, title
  ├── content_group, language, duration_seconds, status
  ├── UNIQUE(content_group, language)  ← enforced at DB level

artwork
  ├── id, entity_type (show|episode), entity_id
  ├── artwork_type (POSTER|BANNER|THUMBNAIL)
  ├── storage_key, width, height, file_size_bytes

publish_runs
  ├── id, started_at, completed_at, actor_id (FK users)
  ├── outcome (SUCCESS|FAILED), counts (JSON), error_message
```

---

### Atomic Publishing Design

**Strategy: Write-then-atomic-rename (temp file pattern)**

```
1. Validate entire catalogue (fail fast — do not write anything)
2. Generate full catalogue JSON in memory
3. Write to catalogue_tmp_{uuid}.json (new temp path)
4. Validate written temp file is valid JSON (integrity check)
5. os.replace(tmp_path, live_path)  ← POSIX atomic on same filesystem
   (on Windows: equivalent atomic move via pathlib)
6. Record publish_run with SUCCESS + counts
7. If ANY step fails → delete temp file → record FAILED publish_run
   → reader always sees old valid catalogue
```

**Why this is safe:**
- `os.replace()` is atomic at the OS level on the same filesystem
- A crash at step 3 leaves the temp file orphaned (not live)
- A crash at step 5 leaves either old or new — never partial
- Reader always sees a complete, valid file

---

### Storage Abstraction Design

```python
# Conceptual interface
class StorageProvider(Protocol):
    async def upload(self, key: str, data: bytes, content_type: str) -> str: ...
    async def delete(self, key: str) -> None: ...
    def public_url(self, key: str) -> str: ...

class LocalStorageProvider:    # dev — writes to ./storage/ volume
    ...

class R2StorageProvider:       # prod — Cloudflare R2 via boto3/s3
    ...
```

Selected by environment variable: `STORAGE_BACKEND=local|r2`

---

### Search Design

**Approach: PostgreSQL full-text search + indexed LIKE for simple cases**

- `shows.title` indexed with `GIN(to_tsvector('english', title))`
- `episodes.title` similarly indexed
- Category filter: indexed enum column
- Language filter: indexed column
- Section filter: indexed column
- Filters compose with `AND` clauses

**Scale limitation (will be documented in README):**  
This approach works well up to ~100K shows. Beyond that, a dedicated search engine (Elasticsearch, Typesense, Meilisearch) would be needed. For an OTT catalogue at launch scale, PostgreSQL FTS is appropriate and avoids operational overhead of a separate search cluster.

---

### Catalogue Schema (stable, documented)

```json
{
  "version": "1.0",
  "published_at": "ISO8601",
  "published_by": "username",
  "sections": {
    "kids": {
      "shows": [
        {
          "id": "uuid",
          "title": "string",
          "synopsis": "string",
          "category": "string",
          "artwork": {
            "poster": "url",
            "banner": "url"
          },
          "seasons": [
            {
              "season_number": 1,
              "title": "Season 1",
              "episodes": [
                {
                  "content_group": "uuid",
                  "episode_number": 1,
                  "title": "string",
                  "duration_seconds": 1200,
                  "artwork": { "thumbnail": "url" },
                  "languages": [
                    { "language": "en", "episode_id": "uuid" },
                    { "language": "hi", "episode_id": "uuid" }
                  ]
                }
              ]
            }
          ],
          "trailers": [
            {
              "content_group": "uuid",
              "title": "string",
              "languages": [...]
            }
          ]
        }
      ]
    }
  }
}
```

---

### Authorization Model

| Role | CRUD shows/seasons/episodes | Upload artwork | Publish | View validation report |
|---|---|---|---|---|
| EDITOR | ✅ | ✅ | ❌ (403) | ✅ |
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| Unauthenticated | ❌ (401) | ❌ | ❌ | ❌ |

Enforced via FastAPI dependency injection on each route. No frontend bypass possible.

---

### Artwork Validation Rules

| Type | Ratio | Target Dimensions | Max Size |
|---|---|---|---|
| POSTER | 2:3 | ~600×900 | 200 KB |
| BANNER | 16:9 | ~1280×720 | 200 KB |
| THUMBNAIL | 16:9 | ~640×360 | 200 KB |

Validation tolerance: ±5% on aspect ratio (to handle real-world encoding rounding). Validated server-side via Pillow. Human-readable error messages returned in API response.

---

### Season 0 / Trailers Rule

- Season `season_number = 0` is reserved for trailers
- CMS: Shows it labeled "Trailers" with distinct UI treatment
- Catalogue generation: Season 0 episodes become `show.trailers[]` — NOT in `show.seasons[]`
- Viewer: Renders trailers section separately from numbered seasons
- Season 0 is never shown as "Season 0" to end users

---

### Content Group / Language Collapsing

- Episodes sharing same `content_group` → same catalogue entry
- Collapsed into single episode with `languages: [{language, episode_id}]`
- Viewer shows language selector, not duplicate episode entries
- `UNIQUE(content_group, language)` at DB level prevents bad data

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Greenfield — nothing exists | High | Systematic phase execution |
| Atomic publish on Windows dev env | Medium | Use pathlib `replace()` — works cross-platform |
| Async SQLAlchemy session management | Medium | Use dependency-injected sessions, careful session lifecycle |
| Content group uniqueness edge cases | Medium | DB constraint + validation engine catches |
| Docker networking between services | Low | Named network in docker-compose |
| Vite port conflicts | Low | Assign distinct ports in compose |

---

## Phase-by-Phase Dependency Map

```
PHASE 1 (Foundation)
  └─ PHASE 2 (DB Models)
       └─ PHASE 3 (Auth)
            └─ PHASE 4 (CRUD API)
                 ├─ PHASE 5 (Artwork)
                 ├─ PHASE 6 (Validation Engine)
                 │    └─ PHASE 7 (Catalogue Generation)
                 │         └─ PHASE 8 (Atomic Publishing)
                 │              └─ PHASE 9 (Catalog Read/Search API)
                 │                   ├─ PHASE 13–16 (Viewer)
                 └─ PHASE 10–12 (CMS)
                      └─ PHASE 17–18 (Polish)
PHASE 19 (Testing) ─── depends on Phases 1–18
PHASE 20 (Docker/CI) ─ depends on Phases 1–19
PHASE 21 (Prod Readiness) ─ depends on Phase 20
PHASE 22 (Audit) ─ depends on all
PHASE 23 (README) ─ depends on all
```

---

## Port Assignments

| Service | Port (host) |
|---|---|
| PostgreSQL | 5432 |
| Backend (FastAPI) | 8000 |
| CMS (Vite dev) | 3000 |
| Viewer (Vite dev) | 3001 |

---

## What Exists vs What Needs Building

| Component | Status |
|---|---|
| Repository structure | ❌ Must create |
| Backend (FastAPI) | ❌ Must create |
| CMS (React+TS) | ❌ Must create |
| Viewer (React+TS) | ❌ Must create |
| PostgreSQL schema | ❌ Must create |
| Alembic migrations | ❌ Must create |
| Auth system | ❌ Must create |
| Artwork pipeline | ❌ Must create |
| Catalogue generation | ❌ Must create |
| Atomic publishing | ❌ Must create |
| Seed data | ❌ Must create |
| Docker Compose | ❌ Must create |
| GitHub Actions CI | ❌ Must create |
| `.env.example` | ❌ Must create |
| README | ❌ Must create |

**Everything is greenfield. Zero reuse possible — zero duplication risk.**

---

## Key Implementation Notes

1. **Backend first** — All phases 1–9 are backend. CMS/Viewer consume a working API.
2. **No fake data** — Viewer always reads from published catalogue endpoint.
3. **Viewer never calls admin endpoints** — strict API client separation.
4. **Local storage uses Docker volume** — `/app/storage` mounted from host.
5. **Seed data** — Will include real shows, seasons, episodes with proper content_group values to demonstrate collapsing.
6. **Tests focus on risky logic** — artwork validation, auth, publish, content_group grouping.
7. **No Redux** — TanStack Query handles server state; React state for UI state.
8. **No unnecessary deps** — Will justify every non-standard package.

---

## Open Questions

> [!IMPORTANT]
> **Visual reference image**: The assessment mentions "the provided visual reference" for the Viewer design. No image file was found in the repository (it's empty). I will proceed with an original premium children's OTT design inspired by the written description (colorful, playful, premium, child-friendly, rounded cards, cinematic hero). If you have a reference image to share, please provide it before Phase 13 (Viewer Foundation).

> [!NOTE]
> **Cloudflare R2 credentials**: R2 storage provider will be implemented but credentials will only be wired via environment variables. No real R2 bucket is needed for development — local storage provider will be default. Production R2 credentials should be provided before deploying to production.

> [!NOTE]
> **Real media URLs**: No actual video stream URLs exist. The player experience (Phase 17) will implement a graceful placeholder/embed approach and will be clearly documented as a stub.
