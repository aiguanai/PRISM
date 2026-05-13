# Legal Document Risk Analysis Backend

A FastAPI backend that analyzes legal documents (TXT / PDF / DOCX) and produces a structured risk report. It extracts text, redacts PII, segments clauses, classifies each clause, explains the reasoning, simplifies the language, validates against RBI fair-practice rules, and returns a JSON summary.

## Project overview

- **Framework:** FastAPI
- **Runtime:** Python 3.10+
- **Persistence:** None (stateless API)
- **Auth:** None
- **ML:** Optional Legal-BERT (HuggingFace) with automatic heuristic fallback

This backend is designed to plug into:
- a separate frontend (Person 1)
- RBI rules + PII scrubber updates (Person 2)
- a trained Legal-BERT model (Person 3) dropped into `models/weights/prism-legal-bert/`

## Folder structure

```
backend/
├── main.py
├── requirements.txt
├── README.md
├── .gitignore
├── routers/
│   ├── __init__.py
│   └── analyze.py
├── services/
│   ├── __init__.py
│   ├── extractor.py
│   ├── pii_scrubber.py
│   ├── segmenter.py
│   ├── classifier.py
│   ├── explainer.py
│   ├── simplifier.py
│   ├── validator.py
│   └── report_gen.py
├── data/
│   └── rbi_rules.json
├── models/
│   └── weights/        (drop trained model here)
├── tests/
│   └── test_sample.py
└── uploads/
```

## Pipeline

```
Upload File → Extractor → PII Scrubber → Segmenter →
  Classifier → Explainer → Simplifier → Validator → Report Generator → JSON
```

## Setup

1. Clone the repository
   ```bash
   git clone <your-repo-url>
   cd backend
   ```

2. Create a virtual environment (recommended)
   ```bash
   python -m venv venv
   # macOS / Linux
   source venv/bin/activate
   # Windows
   venv\Scripts\activate
   ```

3. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```

## Run

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.
Interactive docs (Swagger UI): `http://localhost:8000/docs`

## API usage

### `POST /analyze`

Upload a single file for risk analysis.

**Request (curl):**
```bash
curl -X POST "http://localhost:8000/analyze" \
  -F "file=@/path/to/document.pdf"
```

**Response:**
```json
{
  "status": "success",
  "filename": "document.pdf",
  "results": [
    {
      "clause": "The borrower shall pay interest at 18% per annum...",
      "label": "Interest Clause",
      "confidence": 0.91,
      "explanation": "Mentions interest-related terms (interest, per annum, compounded); review the rate, compounding method, and reset schedule.",
      "simplified": "The borrower must pay interest at 18% per year...",
      "risk_level": "HIGH"
    }
  ],
  "summary": {
    "total_clauses": 20,
    "high_risk": 5,
    "medium_risk": 4,
    "safe": 11
  }
}
```

### `POST /analyze/batch`

Upload multiple files at once. Returns a list of reports.

### `GET /health`

Health check.

## Sample test

```bash
# In one terminal:
uvicorn main:app --reload

# In another:
python tests/test_sample.py
```

## ML mode (optional)

By default the classifier runs in **heuristic** mode (keyword-based, no model required).

To use Legal-BERT:

1. Install ML dependencies:
   ```bash
   pip install torch transformers
   ```

2. Place the trained model at `models/weights/prism-legal-bert/` (must contain HuggingFace `config.json`, tokenizer files, and weights).

3. Enable ML mode via environment variable:
   ```bash
   export CLASSIFIER_MODE=ml
   uvicorn main:app --reload
   ```

If the weights are missing or fail to load, the system automatically falls back to heuristic mode — no code change required.

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Legal Document Risk Analysis backend"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## License

MIT (or your choice).
