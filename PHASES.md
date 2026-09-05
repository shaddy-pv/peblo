# Peblo TV Mini — Master Implementation Roadmap (Phases 0 – 23)

This document tracks the complete 24-phase implementation roadmap for the **Peblo TV Mini** full-stack platform, based on the official assessment specification and architectural plan.

---

## Progress Overview

| Phase | Description | Layer | Status | Git Commit |
|---|---|---|---|---|
| **Phase 0** | Project Audit & Implementation Plan | Docs / Planning | ✅ Completed | — |
| **Phase 1** | Foundation & Repository Scaffold | Infra / Backend | ✅ Completed | `0820bb1` |
| **Phase 2** | Database Models, Alembic Migration & Seed Loader | Backend / DB | ✅ Completed | `cb7e7c1` |
| **Phase 3** | Authentication & Role Authorization (Editor vs Admin) | Backend / Auth | ✅ Completed | `670f079` |
| **Phase 4** | CRUD API for Shows, Seasons & Episodes | Backend / CRUD | ✅ Completed | `d13b817` |
| **Phase 5** | Artwork System & Storage Abstraction (Local/R2) | Backend / Storage | ✅ Completed | `7bad7e2`, `d8a2dd0` |
| **Phase 6** | Validation Engine & Publish-Readiness Report | Backend / Validation | ✅ Completed | `3ac661e` |
| **Phase 7** | Catalogue Generation & Transformation | Backend / Catalogue | ✅ Completed | `ed51b10` |
| **Phase 8** | Atomic Publishing Pipeline & Admin Endpoints | Backend / Publishing | ✅ Completed | `34eb946` |
| **Phase 9** | Catalogue Read & Composed Search API | Backend / Catalog API | ✅ Completed | `2073061` |
| **Phase 10** | Internal CMS Foundation (Shell, Router, TanStack Query) | CMS Frontend | ✅ Completed | `126927d` |
| **Phase 11** | CMS Content Management (Forms, Artwork Uploads, Lists) | CMS Frontend | ✅ Completed | `0fadf72` |
| **Phase 12** | CMS Publish Workflow (Report, Run History, Permissions) | CMS Frontend | ⏳ Next | — |
| **Phase 13** | Viewer Foundation (Shell, Design System, Responsive) | Viewer Frontend | ⏳ Upcoming | — |
| **Phase 14** | Viewer Home (Hero Banner, Section Rows, Posters) | Viewer Frontend | ⏳ Upcoming | — |
| **Phase 15** | Viewer Search & Filter Experience | Viewer Frontend | ⏳ Upcoming | — |
| **Phase 16** | Viewer Show Details (Language Selector, Trailers, Seasons) | Viewer Frontend | ⏳ Upcoming | — |
| **Phase 17** | Player Experience (Graceful Stub / Embed) | Viewer Frontend | ⏳ Upcoming | — |
| **Phase 18** | UI/UX Polish (Accessibility, Animations, Loading Skeletons) | Full Stack UI | ⏳ Upcoming | — |
| **Phase 19** | End-to-End Testing & Quality Assurance | QA / Testing | ⏳ Upcoming | — |
| **Phase 20** | Docker Compose & CI Pipeline Finalization | DevOps / Docker | ⏳ Upcoming | — |
| **Phase 21** | Production Readiness (Security, Alerting, Secrets) | Operability | ⏳ Upcoming | — |
| **Phase 22** | Final Assessment Audit vs Spec | Audit / Verification | ⏳ Upcoming | — |
| **Phase 23** | README & Submission Documentation | Documentation | ⏳ Upcoming | — |

---

## Detailed Phase Breakdown

### PHASE 0 — PROJECT AUDIT & PLAN
- **Scope**: Greenfield repo inspection, toolchain version verification, seed data analysis (discovering deliberate flaws P1–P8), monorepo architectural design.
- **Status**: Completed.

### PHASE 1 — FOUNDATION
- **Scope**: Monorepo directory structure, FastAPI backend app skeleton, settings with Pydantic v2, Docker Compose baseline, CI workflow, health check endpoint.
- **Status**: Completed (`0820bb1`).

### PHASE 2 — DATABASE & DOMAIN MODEL
- **Scope**: SQLAlchemy 2 async ORM models (`User`, `Show`, `Season`, `Episode`, `Artwork`, `PublishRun`), Alembic migration `0001_initial_schema.py`, idempotent database seeder (`app/scripts/seed.py`).
- **Status**: Completed (`cb7e7c1`).

### PHASE 3 — AUTHENTICATION & AUTHORIZATION
- **Scope**: Native `bcrypt` hashing, JWT access token issuing/decoding (`python-jose`), `AuthService`, FastAPI dependencies `get_current_user`, `require_role`, `require_admin`, `require_editor`, routes (`/auth/login`, `/auth/token`, `/auth/me`).
- **Status**: Completed (`670f079`).

### PHASE 4 — CRUD API
- **Scope**: Comprehensive CRUD for Shows, Seasons, Episodes with pagination (`PaginatedResponse`), search, status filters, section validation, duration validation on publish, and unique `(content_group, language)` enforcement.
- **Status**: Completed (`d13b817`).

### PHASE 5 — ARTWORK SYSTEM & STORAGE ABSTRACTION
- **Scope**: `StorageProvider` abstract base class, `LocalStorageProvider`, `R2StorageProvider`, Pillow-based `ArtworkValidator` enforcing 200KB ceiling, aspect ratio (2:3, 16:9), dimensions, and multipart upload endpoints.
- **Status**: Completed (`7bad7e2`, `d8a2dd0`).

### PHASE 6 — VALIDATION ENGINE
- **Scope**: `ValidationEngine.generate_report`, `GET /admin/validation-report` detecting flaws P1–P8 (missing section, missing artwork, missing duration, duplicate variants, title casing, incomplete localizations), categorized into blockers vs warnings with actionable editor fixes.
- **Status**: Completed (`3ac661e`).

### PHASE 7 — CATALOGUE GENERATION
- **Scope**: Denormalized catalogue models, `CatalogueBuilder.build_catalogue` collapsing `content_group` language variants into single entries, separating Season 0 trailers into `show.trailers[]`, grouping by section, deterministic ordering.
- **Status**: Completed (`ed51b10`).

### PHASE 8 — ATOMIC PUBLISHING
- **Scope**: Pre-publish validation gate, temp file write-then-atomic-rename (`catalogue_tmp_{uuid}.json` -> `catalogue.json`), audit logging via `PublishRun` tracking actors, timestamps, counts, and outcomes, `POST /admin/catalog/publish` (admin only) and `GET /admin/catalog/publish/runs`.
- **Status**: Completed (`34eb946`).

### PHASE 9 — CATALOG READ & SEARCH API
- **Scope**:
  - `GET /catalog`: Serves the live published catalogue safely and quickly to the Viewer.
  - `GET /catalog/search?q=&category=&language=&section=`: High-speed catalogue search supporting title query, category filtering, language filtering, and section filtering where all filters compose seamlessly.
- **Status**: Completed.

### PHASE 10 — CMS FOUNDATION
- **Scope**: React + TypeScript CMS shell, React Router v6, TanStack Query v5 provider, auth state management, token handling, layout navigation, permission-aware UI states.
- **Status**: Completed.

### PHASE 11 — CMS CONTENT MANAGEMENT
- **Scope**: Show and episode list with search/filters, create/edit modal forms, 3 labelled artwork upload slots (poster, banner, thumbnail) with live dimensions, aspect ratio validation, live preview, and human-readable error display.
- **Status**: Completed (`0fadf72`).


### PHASE 12 — CMS PUBLISHING
- **Scope**: Publish dashboard with real-time publish-readiness validation report, disabled publish button with explicit reason badges when blocked, Admin publish action, run history with audit metrics and status badges.

### PHASE 13 — VIEWER FOUNDATION
- **Scope**: Viewer React + TypeScript SPA, responsive shell, custom design tokens, TanStack Query client wired exclusively to `/catalog` endpoints (strict zero-admin-access boundary).

### PHASE 14 — VIEWER HOME
- **Scope**: Netflix-style children's OTT homepage: featured hero with banner artwork, horizontal scrolling content rows grouped by section, poster artwork cards, smooth transitions, loading skeletons.

### PHASE 15 — VIEWER SEARCH & FILTERS
- **Scope**: Search bar with debounced queries, category filter pills, language filter toggles, live filtered grid, and friendly empty states.

### PHASE 16 — VIEWER SHOW DETAILS
- **Scope**: Show detail view with synopsis, banner, seasons and episodes list with thumbnails and duration, language variant selector for collapsed episodes, and separate trailers section for Season 0.

### PHASE 17 — PLAYER EXPERIENCE
- **Scope**: Graceful video player entry modal/view with episode metadata, duration, language options, and clearly documented media streaming stub.

### PHASE 18 — UX POLISH
- **Scope**: Mobile responsiveness across breakpoints (360px–1920px), playful child-friendly typography and soft gradients, keyboard accessibility, loading skeletons, image error fallbacks.

### PHASE 19 — TESTING & QUALITY
- **Scope**: End-to-end test verification across backend (pytest unit + integration) and frontend (TypeScript typecheck, lint, Vite build).

### PHASE 20 — DOCKER & CI
- **Scope**: Verify single-command `docker-compose up` orchestrating PostgreSQL, backend, CMS, and Viewer seeded and running; finalize GitHub Actions CI workflow.

### PHASE 21 — PRODUCTION READINESS
- **Scope**: Audit environment variables, secret management documentation, production health checks, database indexes, and Cloudflare R2 deployment steps.

### PHASE 22 — FINAL AUDIT
- **Scope**: Comprehensive assessment matrix verifying every single requirement from the take-home challenge specification.

### PHASE 23 — README & SUBMISSION
- **Scope**: Complete README with architectural decisions, trade-offs, atomic publish crash recovery analysis, search scalability limits, AI usage disclosure, and screen recording checklist.
