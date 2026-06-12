# PRISM — Predatory Risk Intelligence for Smart MSME Lending

An AI platform that detects predatory and RBI non-compliant clauses in MSME loan agreements using NLP.

Upload a PDF, DOCX, or image of any loan agreement. PRISM segments every clause, classifies it into one of 7 predatory risk categories using a fine-tuned Legal-BERT model, cross-checks against 170 RBI rules, and generates a risk report.

For system design, the analysis pipeline, and full module breakdown, see
[ARCHITECTURE.md](ARCHITECTURE.md). For product spec and backlog, see
[SPECS.md](SPECS.md).

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Python | 3.11+ | Backend |
| Node.js | 18+ | Frontend |
| Tesseract OCR | Any | For scanned PDFs / images |

**Install Tesseract:**
- Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki — add to PATH
- macOS: `brew install tesseract`
- Ubuntu: `sudo apt install tesseract-ocr`

---

## 1. Clone the Repository

```bash
git clone https://github.com/aiguanai/PRISM.git
cd PRISM
```

---

## 2. Download the Trained Model

The model is hosted on HuggingFace at **[aiguanai/legalbert-finetuned-india](https://huggingface.co/aiguanai/legalbert-finetuned-india)** and must be downloaded into a `model/` folder at the project root.

**Option A — huggingface-hub CLI (recommended):**

```bash
pip install huggingface-hub
huggingface-cli download aiguanai/legalbert-finetuned-india --local-dir ./model
```

**Option B — Git LFS:**

```bash
git lfs install
git clone https://huggingface.co/aiguanai/legalbert-finetuned-india model
```

**Option C — Manual download:**

1. Go to https://huggingface.co/aiguanai/legalbert-finetuned-india
2. Click **Files and versions**
3. Download all files into a folder named `model/` at the project root

After downloading, your folder structure should be:

```
PRISM/
├── model/
│   ├── config.json
│   ├── model.safetensors        ← or pytorch_model.bin
│   ├── tokenizer.json
│   ├── tokenizer_config.json
│   └── prism_label_config.json
├── backend/
└── frontend/
```

---

## 3. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## 4. Run the Backend

```bash
cd backend

# Windows PowerShell
$env:CLASSIFIER_MODE="ml"; uvicorn main:app --reload --port 8000

# macOS / Linux
CLASSIFIER_MODE=ml uvicorn main:app --reload --port 8000
```

The backend starts at **http://localhost:8000**. You should see:

```
[classifier] Loaded model from '../model'
INFO: Uvicorn running on http://127.0.0.1:8000
```

> If you see `[classifier] Mode: heuristic` instead, the model wasn't found. Check that `model/` exists at the project root and contains `config.json`.

### Optional — Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `CLASSIFIER_MODE` | `heuristic` | Set to `ml` to use the trained model |
| `ALLOWED_ORIGINS` | `http://localhost:3000,...` | CORS allowlist (comma-separated) |
| `MAX_FILE_MB` | `25` | Upload size limit |
| `DB_URL` | `sqlite+aiosqlite:///./prism.db` | Analysis history database |
| `REPORT_TTL_HOURS` | `24` | PDF reports older than this are auto-deleted (regenerated on demand) |
| `ANALYZE_RATE_LIMIT` | `10/minute` | Per-IP rate limit on `/analyze` |
| `MAX_OCR_PAGES` | `30` | OCR page cap for scanned PDFs |

---

## 5. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file inside the `frontend/` directory:

```env
NEXT_PUBLIC_USE_MOCK_DATA=false
BACKEND_URL=http://localhost:8000
```

Run the frontend:

```bash
npm run dev
```

The app opens at **http://localhost:3000**.

---

## 6. Usage

1. Open http://localhost:3000
2. Click **New Analysis** in the sidebar
3. Drop or select a PDF, DOCX, or image of an MSME loan agreement
4. Click **Request Expert Review**
5. Wait for analysis (~20–40 seconds depending on document size)
6. View flagged clauses, RBI violations, and risk scores
7. Click **Export Report** to download a PDF risk report
8. Every analysis is saved — revisit it any time from **History** (severity charts, re-open, delete)
9. **Settings** lets you toggle dark mode, hide safe clauses, check backend connectivity, and clear all history

---

## Alternative: Run with Docker

With Docker installed, one command starts both services (heuristic classifier mode by default):

```bash
docker compose up --build
```

To use the trained model in Docker, download the weights into `model/` first (step 2), then:

```bash
CLASSIFIER_MODE=ml docker compose up --build
```

Frontend: http://localhost:3000 · Backend: http://localhost:8000. The SQLite database and PDF reports persist in the `prism-data` volume.

---

## Tests

```bash
cd backend
pytest tests -q
```

20 tests cover the PII scrubber, clause segmenter, heuristic classifier, RBI validator, and the full API (upload → analyze → history → report download). GitHub Actions runs them plus a frontend typecheck/build on every push (`.github/workflows/ci.yml`).

---

## Architecture

```
Document Upload
      ↓
Stage 1 — Extraction     pdfplumber → PyMuPDF → Tesseract OCR
      ↓
Stage 2 — Segmentation   Rule-based clause boundary detection
      ↓
Stage 3 — Classification InLegalBERT fine-tuned on CUAD + LEDGAR + MSME data
      ↓                  → 7 labels: SAFE, UNLAWFUL_PENALTY, HIDDEN_FEE,
      ↓                     UNILATERAL_RATE_CHANGE, COLLATERAL_OVERREACH,
      ↓                     ARBITRATION_WAIVER, BALLOON_PAYMENT
Stage 4 — Validation     170 RBI rules (Digital Lending 2022, NBFC FPC,
      ↓                  Co-Lending Model, MSME-specific circulars)
Stage 5 — Explainability Token saliency highlighting
      ↓
Stage 6 — Report         Plain-language simplification + PDF risk report
```

---

## Project Structure

```
PRISM/
├── model/                   ← Trained model weights (downloaded separately)
├── backend/
│   ├── main.py              ← FastAPI entry point, lifespan, CORS, error handler
│   ├── config.py            ← pydantic-settings (env vars)
│   ├── db.py                 ← SQLAlchemy async engine + session
│   ├── rate_limit.py         ← slowapi per-IP rate limiter
│   ├── logging_config.py     ← structured logging + request-ID middleware
│   ├── routers/
│   │   ├── analyze.py       ← /analyze, /analyze/batch, /report endpoints
│   │   └── analyses.py      ← history CRUD (/analyses)
│   ├── services/
│   │   ├── extractor.py     ← Stage 1: PDF/DOCX/image extraction
│   │   ├── segmenter.py     ← Stage 2: Clause segmentation
│   │   ├── pii_scrubber.py  ← Stage 2: PII removal (Aadhaar, PAN, IFSC, etc.)
│   │   ├── classifier.py    ← Stage 3: ML/heuristic classification
│   │   ├── validator.py     ← Stage 4: RBI rule validation
│   │   ├── explainer.py     ← Stage 5: Token highlights
│   │   ├── simplifier.py    ← Stage 5: Plain-language output
│   │   └── report_gen.py    ← Stage 6: PDF report
│   ├── models/
│   │   ├── orm.py           ← Analysis ORM model
│   │   └── schemas.py       ← Pydantic request/response schemas
│   ├── data/
│   │   └── rbi_rules.json   ← 170 RBI rules knowledge base
│   ├── tests/                ← pytest suite (20 tests)
│   └── requirements.txt
├── frontend/
│   ├── app/                 ← Next.js App Router pages + app/api proxy routes
│   ├── components/          ← UI components
│   └── lib/                 ← API client, types, settings
├── notebooks/
│   └── prism_training.ipynb ← Model training notebook (Google Colab)
├── ARCHITECTURE.md          ← system design, pipeline, data model
├── SPECS.md                  ← product spec, capability truth table, backlog
└── README.md
```

---

## Troubleshooting

**"No text could be extracted"**
→ The PDF may be scanned. Ensure Tesseract is installed and on your PATH.

**"No clauses detected"**
→ The document may use unusual formatting. Try a different loan agreement.

**Backend shows heuristic mode instead of ML**
→ Check `model/config.json` exists. Re-run the download step.

**Frontend shows "Analysis failed"**
→ Ensure the backend is running on port 8000 before uploading. Check the terminal where the backend is running for error messages.

**Analysis takes too long (>2 minutes)**
→ First run loads the model into memory. Subsequent analyses on the same backend session will be faster (~20–40s).
