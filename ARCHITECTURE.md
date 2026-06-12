# ARCHITECTURE.md

System design and architecture for PRISM. Keep this current — see
[CLAUDE.md](CLAUDE.md) for the maintenance rule.

---

## 1. High-level shape

```
┌─────────────────────────┐         ┌──────────────────────────────┐
│  Next.js 16 frontend    │  HTTP   │  FastAPI backend             │
│  (React 19, Tailwind v4)│ ──────► │  (Python 3.11, async)        │
│                         │         │                              │
│  app/ pages + app/api/  │         │  routers → services pipeline │
│  proxy routes           │ ◄────── │  SQLite (history) + PDFs     │
└─────────────────────────┘  JSON   └──────────────────────────────┘
```

- Frontend talks to its **own** `app/api/*` proxy routes; those forward to the
  backend (`BACKEND_URL`, default `http://localhost:8000`). The browser never calls
  the Python service directly — keeps CORS simple and lets the proxy hold a small
  in-memory job/result store.
- Backend is a stateless analysis pipeline plus a SQLite store for analysis history
  and a temp directory of generated PDF reports.

---

## 2. Backend

### 2.1 Layout (`backend/`)

| Path | Responsibility |
|---|---|
| `main.py` | App factory, lifespan (init DB, warm model, hourly report cleanup), CORS, request-ID middleware, rate limiter, global JSON error handler. `/` and `/health`. |
| `config.py` | `pydantic-settings`. Env: `ALLOWED_ORIGINS`, `MAX_FILE_MB` (25), `DB_URL`, `REPORT_DIR`, `REPORT_TTL_HOURS` (24), `ANALYZE_RATE_LIMIT` (10/min). |
| `db.py` | Async SQLAlchemy 2.0 engine + `aiosqlite`, `SessionLocal`, `init_db()`, `get_session()` dependency. |
| `rate_limit.py` | `slowapi` limiter keyed on client IP. |
| `logging_config.py` | `setup_logging()` + `RequestIDMiddleware` (per-request id, stage timings). |
| `routers/analyze.py` | `POST /analyze`, `POST /analyze/batch`, `GET /report/{report_id}`. Runs the pipeline, persists, streams PDF. |
| `routers/analyses.py` | History CRUD: `GET /analyses`, `GET /analyses/{id}`, `DELETE /analyses/{id}`, `DELETE /analyses`. |
| `services/*` | The pipeline stages (below). Pure, stateless, thread-offloaded. |
| `models/orm.py` | `Analysis` ORM row. |
| `models/schemas.py` | Pydantic response/request schemas. |
| `data/rbi_rules.json` | **170** RBI / lending-law rules used by the validator. |

### 2.2 The analysis pipeline

`routers/analyze.py::_run_pipeline()` runs six logical stages. CPU-bound work is
pushed to threads with `asyncio.to_thread` so the event loop stays free.

```
upload (TXT/PDF/DOCX)
  │
  1. extract_text            services/extractor.py    PDF/DOCX/TXT → raw text;
  │                                                    OCR fallback (Tesseract),
  │                                                    capped at MAX_OCR_PAGES (30)
  2. segment_clauses         services/segmenter.py    raw text → list of clauses
     scrub_pii               services/pii_scrubber.py Aadhaar/PAN/email/phone → masked
  3. classify_clauses_batch  services/classifier.py   each clause → {label, confidence}
  4. validate_clause         services/validator.py    clause+label → matched RBI rules,
  │                                                    risk_level
  5. explain_clause          services/explainer.py    one-line reason + token highlights
  │                          services/simplifier.py    plain-language rewrite
  6. generate_report         services/report_gen.py   assemble JSON + render PDF
  │
  └─ _save_analysis → SQLite (Analysis row, result_json blob)
```

**Classifier categories (7):** `SAFE`, `UNLAWFUL_PENALTY`, `HIDDEN_FEE`,
`UNILATERAL_RATE_CHANGE`, `COLLATERAL_OVERREACH`, `ARBITRATION_WAIVER`,
`BALLOON_PAYMENT`.

**Two classifier modes** (`CLASSIFIER_MODE`):
- `heuristic` (default) — keyword/rule matching, no weights needed. CI uses this.
- `ml` — trained transformer in `model/`; `warmup_model()` loads it at startup.

**Validator** maps each clause+label to concrete rule IDs in `rbi_rules.json` and a
`risk_level` (`critical|high|medium|low`). This is what powers the "RBI Violations"
view.

**Explainer** returns token-level highlights (SHAP-style in ML mode, keyword
saliency in heuristic mode) — i.e. the exact words that triggered a flag.

### 2.3 Persistence + report lifecycle

- Every analysis writes one `Analysis` row. Columns: `id`, `filename`, `created_at`,
  `total_clauses`, `critical_risk`, `high_risk`, `medium_risk`, `safe`,
  `rbi_violations`, `report_id`, `report_path`, `result_json` (full result blob).
- `to_summary()` denormalizes the row into the wire format the history list uses.
- PDFs live in `REPORT_DIR`. A background loop deletes PDFs older than
  `REPORT_TTL_HOURS`. If a report is requested after expiry, `regenerate_report()`
  rebuilds it on demand from the stored `result_json` — so history never 404s.

### 2.4 Hardening

- CORS allow-list from `ALLOWED_ORIGINS` (no `*`).
- `slowapi` per-IP rate limit on `/analyze`.
- Magic-byte validation on uploads (not just extension).
- OCR page cap to prevent DoS via huge scanned PDFs.
- Global exception handler returns a consistent JSON error shape with `request_id`.

---

## 3. Frontend

### 3.1 Routes (`frontend/app/`)

| Route | Purpose |
|---|---|
| `/` (`page.tsx`) | Hybrid home: hero strip → real-data stat strip → upload → feature grid. Drives the upload→processing→results view state machine. |
| `/new` | Dedicated new-analysis entry. |
| `/history` | Real analysis history: search, pagination, severity charts (Recharts), detail panel, delete. |
| `/settings` | Theme, "show safe clauses" toggle, backend health check, clear-all-history. |

### 3.2 API proxy routes (`frontend/app/api/`)

Browser → these Next route handlers → backend.

| Route | Forwards to | Notes |
|---|---|---|
| `documents/upload` | (holds file) | Stores file in an in-memory `globalThis` map. |
| `documents/[id]/analyze` | `POST /analyze` | Kicks off backend analysis. |
| `jobs/[jobId]/status` | — | Simulated progress phases for the processing UI. |
| `documents/[id]/analysis` | `GET /analyses/{id}` | Falls back to backend DB on in-memory miss (survives refresh). |
| `documents` (GET/DELETE) | `/analyses` | History list + clear-all. |
| `documents/[id]` (GET/DELETE) | `/analyses/{id}` | Single summary + delete. |
| `documents/[id]/report` | `GET /report/{id}` | Streams PDF; backend regenerates if expired. |
| `backend-health` | `GET /health` | 3s-timeout connectivity check for Settings. |

### 3.3 Key lib modules (`frontend/lib/`)

- `api.ts` — typed client: `uploadDocument`, `startAnalysis`, `getJobStatus`,
  `getAnalysisResult`, `getHistory`, `getHistoryDocument`, `deleteHistoryDocument`.
- `types.ts` — `DocumentAnalysis`, `Clause`, `HistoryDocument`, severity types.
- `history-mapper.ts` — backend summary → `HistoryDocument` (risk level/score).
- `settings.ts` — `useSettings()` hook, localStorage-persisted, cross-tab synced.
- `mock-data.ts` — legacy mock fixtures, used only when `NEXT_PUBLIC_USE_MOCK_DATA=true`.

### 3.4 Design system ("Precision Fintech")

Defined entirely in `frontend/app/globals.css`; components consume tokens.

- **Type:** Geist Sans (UI/body/bold headlines), Geist Mono (every number via
  `.num`, tabular-nums). Serif fully removed.
- **Color:** deep green `#004225` + champagne gold `#c9a84c` + warm cream. Gold for
  text uses the AA-safe `--gold-text`; champagne reserved for hairlines/surfaces.
- **Severity tokens:** `--sev-{critical,high,medium,low}` (+ `-bg`, `-border`) for
  both light and dark; exposed as Tailwind colors (`text-sev-critical`, etc.).
- **Depth:** `--shadow-sm/md/lg`; `.card-elevated` helper. Radius 14px (soft-rounded).
- **Frame:** light/quiet header (hairline + gold top rule), deep-green sidebar.
- **Motion:** showy on load/action (count-ups, staggered reveals), **no** infinite
  ambient loops. `CountUp` (`components/ui/count-up.tsx`) is the signature.
- **Themes:** light + dark both first-class via `next-themes` (`class` attribute).

### 3.5 Component map

- `components/layout/` — `dashboard-layout`, `header`, `sidebar` (real recents),
  `prism-logo`, `intelligence-panel`.
- `components/upload/upload-area.tsx` — drop zone + file list + analyze button.
- `components/processing/` — `processing-timeline`, `live-document-scanner`.
- `components/results/` — `results-dashboard`, `risk-score-card`, `clause-card`.
- `components/ui/` — shadcn/Radix primitives + `count-up`.

---

## 4. Deployment

- `backend/Dockerfile` — python:3.11-slim + Tesseract; uvicorn.
- `frontend/Dockerfile` — multi-stage Next standalone build.
- `docker-compose.yml` — backend (8000) + frontend (3000), `prism-data` volume for
  SQLite + reports, read-only `./model` mount for weights, health-gated startup.
- CI: `.github/workflows/ci.yml` — backend pytest (heuristic mode) + frontend
  typecheck/build on every push.

---

## 5. Known architectural debt

- Frontend job progress is **simulated** in the proxy, not streamed from the backend
  (no real SSE yet — see SPECS backlog).
- Upload store is in-memory `globalThis`; survives HMR in dev, lost on prod restart
  (history DB is the durable source of truth, so refresh still works).
- Redesign complete across all surfaces; only the chart severity-color **fallback**
  constant in `history/page.tsx`, the token definitions in `globals.css`, and the
  logo SVG facets still carry literal brand hex (all intentional).
- `lib/mock-data.ts` is retained for `NEXT_PUBLIC_USE_MOCK_DATA=true` and still
  references legacy fields (e.g. a "True Cost" finding) — unused in normal flow.
