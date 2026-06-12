# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What PRISM is

PRISM (Predatory Risk Intelligence for Smart MSME Lending) scans Indian MSME loan
agreements for predatory clauses, hidden charges, and RBI compliance violations,
then returns a plain-language risk report. FastAPI backend + Next.js frontend.

## Read these first (do NOT re-scan the whole codebase)

Before planning or answering architecture questions, read:

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — system design, the analysis pipeline,
  data model, every module's responsibility, request flows, design tokens.
- **[SPECS.md](SPECS.md)** — product specification, feature inventory (what's real
  vs. not), and the product backlog / TODO.

These two files are the source of truth for "how does X work" and "what's left to
build." Trust them over guessing; only open source files when you need exact code,
or when the docs and code appear to disagree (then fix the disagreement).

## Keeping the docs current (IMPORTANT)

After any **significant** change, update the relevant doc in the same change:

- New/removed/renamed module, route, pipeline stage, or DB column → **ARCHITECTURE.md**
- New/removed/shipped feature, or a changed product decision → **SPECS.md**
  (move backlog items to "Shipped" when done; add new ones to the backlog)
- New dev command, convention, or top-level dependency → **CLAUDE.md**

"Significant" = anything that would make these docs wrong. Typo fixes and pure
styling tweaks don't count. If unsure, update.

## Dev commands

Backend (from `backend/`):
```bash
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000           # http://localhost:8000
pytest tests -q                                 # 20 tests
```

Frontend (from `frontend/`):
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (also the CI typecheck gate)
```

Whole stack: `docker compose up --build` (from repo root).

Use trained model instead of heuristics: set `CLASSIFIER_MODE=ml` (weights must be
in `model/` — see backend/README.md for the HuggingFace link).

## Conventions

- **Frontend styling is token-driven.** Use the CSS variables / Tailwind tokens in
  `frontend/app/globals.css` (severity scale, shadows, `card-elevated`, `.num`,
  `label-caps`). Do **not** add hardcoded hex in `style={{}}`. Numbers render in
  Geist Mono via `.num`; headings/body in Geist Sans. No serif.
- **Severity** anywhere is one of `critical | high | medium | low`, colored from the
  `--sev-*` tokens.
- Backend pipeline stages are pure, thread-offloaded functions in `services/`.
  Keep them stateless; persistence lives in `db.py` + `models/orm.py`.
- Windows shell is PowerShell. Repo currently has no lint step beyond `tsc`/build.

## Platform notes

- OS: Windows. Default shell PowerShell (`$null`, `$env:VAR`, backtick continuation).
- `model/`, `notinuse/`, `paper/`, `*.db`, reports, and venvs are gitignored.
