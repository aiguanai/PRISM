# SPECS.md

Product specification and backlog for PRISM. Keep current — see
[CLAUDE.md](CLAUDE.md). Architecture lives in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. Product

**PRISM — Predatory Risk Intelligence for Smart MSME Lending.**

Indian MSME owners are handed dense loan agreements they can't fully parse and sign
terms that are predatory or non-compliant with RBI rules. PRISM lets a user upload a
loan agreement (PDF/DOCX/TXT) and get back, in plain language:

- which clauses are risky and how risky (`critical/high/medium/low`),
- which RBI / lending-law rules each risky clause may violate,
- the exact words that triggered each flag,
- a downloadable PDF risk report,
- a searchable history of past analyses with charts.

**Primary audience priority:** 1) hackathon judges / demo, 2) real MSME owners
(non-technical — clarity and plain language matter), 3) recruiters / portfolio.

---

## 2. Capabilities — what is REAL

Every marketing claim on the site must map to a real backend capability. Current
truthful capability set:

| Capability | Backed by | Status |
|---|---|---|
| Predatory clause detection (7 categories) | `services/classifier.py` | ✅ real |
| Hidden-fee / disguised-charge flagging | classifier `HIDDEN_FEE` + validator | ✅ real |
| Collateral / lien overreach detection | classifier `COLLATERAL_OVERREACH` | ✅ real |
| Unilateral rate-change detection | classifier `UNILATERAL_RATE_CHANGE` | ✅ real |
| Arbitration-waiver detection | classifier `ARBITRATION_WAIVER` | ✅ real |
| Balloon-payment detection | classifier `BALLOON_PAYMENT` | ✅ real |
| RBI compliance check (170 rules) | `services/validator.py` + `data/rbi_rules.json` | ✅ real |
| Plain-language clause summaries | `services/simplifier.py` | ✅ real |
| Explainable flags (token highlights) | `services/explainer.py` | ✅ real |
| PII redaction before analysis | `services/pii_scrubber.py` | ✅ real |
| PDF risk report (regenerates on demand) | `services/report_gen.py` | ✅ real |
| Analysis history + search + charts | SQLite + `/history` | ✅ real |
| Scanned-PDF OCR | Tesseract in `extractor.py` | ✅ real |

### NOT real (do not advertise)

- **True Cost / Effective APR calculator** — backend computes **no** effective rate,
  EMI, or total-repayment math. The old "True Cost Calculator" feature card was
  removed for this reason. Only re-add the claim if the feature is actually built
  (it's in the backlog below).
- Borrower demographics / loan-amount stats in history detail — these were mock-only
  fields the backend never produced.

---

## 3. Shipped (done)

### Backend / platform
- ✅ SQLite persistence (SQLAlchemy 2.0 async + aiosqlite); history CRUD endpoints.
- ✅ Report lifecycle: TTL cleanup + on-demand regeneration from stored JSON.
- ✅ Structured logging, request IDs, per-stage timings, global JSON error shape.
- ✅ Config via pydantic-settings; CORS allow-list (no `*`).
- ✅ Rate limiting (slowapi) + magic-byte validation + OCR page cap.
- ✅ Tests (20 pytest) + GitHub Actions CI.
- ✅ Docker: backend + frontend + compose with data volume and model mount.

### Frontend
- ✅ Real history page (search, pagination, Recharts severity charts, delete, reopen).
- ✅ Real settings page (theme, show-safe-clauses, backend health, clear history).
- ✅ Dark mode (next-themes), both themes first-class.
- ✅ Sidebar "Recent" wired to real backend data.

### Redesign — "Precision Fintech" (complete)
- ✅ **Phase 1 — Foundation:** Geist Sans/Mono via `next/font`, serif removed;
  `globals.css` rewritten (severity tokens, shadow scale, soft radius, gold-text);
  `CountUp` component.
- ✅ **Phase 2 — Frame:** light/quiet header, deep-green sidebar with real recents,
  logo de-pulsed. (Sidebar full-height clip fixed; dev indicator hidden.)
- ✅ **Phase 3 — Home:** hybrid hero + data-first stat strip (count-ups, severity
  accents) + restyled upload zone + honest feature grid.
- ✅ **Phase 4 — Rollout:** results dashboard + risk-score-card (mono count-ups,
  gauge sweep) + clause-card on tokens, de-pulsed; history page (dense rows, themed
  Recharts that re-theme via CSS-var resolution in light/dark, skeletons, empty
  state); settings + new pages on tokens; processing-timeline + live-document-scanner
  retoken. Inline brand hex swept (only token defs, logo SVG, chart fallback remain).

---

## 4. Backlog / TODO

### Tier 3 — differentiators (not started)
- [ ] **LLM integration for document analysis** — replace/augment heuristic+ML
  classifier with an LLM pass (clause classification, explanation quality,
  summarization). Evaluate cost/latency vs current pipeline before swapping default.
- [ ] **Loss estimate if loan is signed** — quantify potential ₹ loss from flagged
  predatory clauses (penal interest, hidden fees, balloon payments) over the loan
  term. Related to / may subsume the True Cost calculator below.
- [ ] **True Cost / Effective APR calculator** (real). Extract stated rate + fees
  from clauses, compute effective annual rate + total repayment. Only then may the
  "True Cost" claim return to the UI. Strong MSME-facing differentiator.
- [ ] **Real SSE progress streaming** — replace the simulated proxy job phases with
  backend `StreamingResponse` stage events.
- [ ] **Hindi / regional language support** — Tesseract `hin` traineddata +
  translation pre-pass. High impact for real MSME users.
- [ ] **"Explain this clause" chat** — LLM-backed Q&A on a flagged clause, with a
  rule-based fallback.
- [ ] **Shareable report links** — UUID token, report viewable without re-upload.
- [ ] **RBI rules browser** (`/rules`) — searchable read-only UI over the 170 rules.
- [ ] **Model evaluation page** — per-label precision/recall from an eval set.
- [ ] **Document comparison** — pick two analyses, side-by-side risk + clause diff.

### Smaller / cleanup
- [ ] Durable upload store (replace in-memory `globalThis` for prod multi-instance).
- [ ] Verify full Docker stack end-to-end (`docker compose up --build`).

---

## 5. Non-goals (deliberately skipped at this scale)

Postgres, Redis, Celery, full OAuth/multi-tenant auth. SQLite + in-process tasks are
sufficient for the current demo/MSME scope.
