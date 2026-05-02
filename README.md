# PRISM — Predatory Risk Intelligence for Smart MSME Lending

Detects predatory and non-compliant clauses in MSME loan agreements using NLP.

---

## Quick Start

### 1. Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

> **Windows note:** WeasyPrint requires GTK. Install via `pip install weasyprint` then follow
> the [WeasyPrint Windows guide](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#windows).
> If WeasyPrint install fails, the app still works — it saves an HTML report as fallback.

> **OCR note:** Tesseract must be installed separately for scanned PDF / image support.
> Download from https://github.com/UB-Mannheim/tesseract/wiki and add to PATH.

> **Optional — zero-shot model** (`facebook/bart-large-mnli`, ~1.6 GB):
> Enable with `USE_ZERO_SHOT=true` env variable. Not required — heuristics work well without it.

> **Optional — Ollama** for plain-language explanations:
> Install Ollama, run `ollama pull llama3.1:8b`, then `ollama serve`.

### 2. Start the backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### 3. Open the frontend

Open `frontend/index.html` directly in your browser (no build step required).

---

## Quick test (no frontend)

```bash
cd backend
python test_sample.py
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `USE_ZERO_SHOT` | `false` | Enable BART zero-shot classifier |
| `USE_OLLAMA` | `true` | Enable Ollama LLM explanations |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llama3.1:8b` | Ollama model name |
| `PRISM_REPORTS_DIR` | system temp | Directory for generated reports |

---

## Architecture

```
Upload → Extract → Segment → Classify → Validate → Explain → Simplify → Report PDF
```

- **Extraction:** pdfplumber → PyMuPDF → Tesseract OCR
- **Segmentation:** Rule-based (numbered patterns) + semantic embeddings (MiniLM)
- **Classification:** Regex/keyword heuristics + optional BART zero-shot ensemble
- **Validation:** 16 real RBI Master Circular rules (see `backend/data/rbi_rules.json`)
- **Report:** WeasyPrint PDF with SVG risk gauge, highlighted clauses, RBI citations
