"""
Clause classifier.

Two modes are supported:

  - heuristic (default):  keyword-based, no model needed.
  - ml:                   Hugging Face text-classification pipeline loaded from
                          `models/weights/prism-legal-bert/`.

Mode is selected by the env var CLASSIFIER_MODE (default: heuristic).
If ML mode is requested but the weights are missing or fail to load, the
classifier silently falls back to heuristic mode so the API keeps working.
"""
import os
from typing import Dict

CATEGORIES = [
    "Interest Clause",
    "Penalty Clause",
    "Termination Clause",
    "Arbitration Clause",
    "Liability Clause",
    "Other",
]

# Keywords used for heuristic classification AND for the explainer.
CATEGORY_KEYWORDS: Dict[str, list] = {
    "Interest Clause": [
        "interest", "rate of interest", "interest rate", "apr",
        "compounded", "compounding", "per annum", "p.a.",
        "floating rate", "fixed rate", "reset",
    ],
    "Penalty Clause": [
        "penalty", "penalties", "fine", "late fee", "default",
        "overdue", "additional charge", "penal interest",
        "liquidated damages",
    ],
    "Termination Clause": [
        "terminate", "termination", "cancel", "cancellation",
        "revoke", "rescind", "end this agreement", "discontinue",
        "forthwith",
    ],
    "Arbitration Clause": [
        "arbitration", "arbitrator", "dispute resolution",
        "mediation", "tribunal", "jurisdiction", "governing law",
    ],
    "Liability Clause": [
        "liability", "liable", "indemnify", "indemnification",
        "hold harmless", "damages", "loss", "responsibility",
    ],
}

CLASSIFIER_MODE = os.getenv("CLASSIFIER_MODE", "heuristic").lower()
ML_MODEL_DIR = os.getenv("ML_MODEL_DIR", "models/weights/prism-legal-bert")

_ml_pipeline = None
_ml_available = False


def warmup_model() -> None:
    """Called at startup. Attempts to load the ML model if ML mode is requested."""
    global _ml_pipeline, _ml_available

    if CLASSIFIER_MODE != "ml":
        print("[classifier] Mode: heuristic")
        return

    if not os.path.isdir(ML_MODEL_DIR):
        print(
            f"[classifier] ML mode requested but weights not found at "
            f"'{ML_MODEL_DIR}'. Falling back to heuristic."
        )
        return

    try:
        from transformers import pipeline  # type: ignore

        _ml_pipeline = pipeline(
            "text-classification",
            model=ML_MODEL_DIR,
            tokenizer=ML_MODEL_DIR,
        )
        _ml_available = True
        print(f"[classifier] Loaded Legal-BERT from '{ML_MODEL_DIR}'")
    except Exception as exc:  # pragma: no cover
        print(
            f"[classifier] Failed to load ML model ({exc}). "
            "Falling back to heuristic."
        )
        _ml_pipeline = None
        _ml_available = False


def classify_clause(clause: str) -> Dict:
    """
    Classify a single clause.

    Returns: { "label": <category>, "confidence": <float 0..1> }
    """
    if not clause or not clause.strip():
        return {"label": "Other", "confidence": 0.0}

    if _ml_available and _ml_pipeline is not None:
        try:
            result = _ml_pipeline(clause[:512])[0]
            return {
                "label": _normalize_label(result.get("label", "Other")),
                "confidence": round(float(result.get("score", 0.0)), 2),
            }
        except Exception:
            # If inference fails for some reason, fall back gracefully.
            pass

    return _classify_heuristic(clause)


def _classify_heuristic(clause: str) -> Dict:
    text = clause.lower()
    scores: Dict[str, int] = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in text)
        if hits:
            scores[category] = hits

    if not scores:
        return {"label": "Other", "confidence": 0.30}

    best = max(scores, key=lambda k: scores[k])
    total = sum(scores.values())
    confidence = min(0.95, 0.50 + (scores[best] / max(total, 1)) * 0.45)
    return {"label": best, "confidence": round(confidence, 2)}


def _normalize_label(label: str) -> str:
    """Map raw model labels to one of our canonical categories when possible."""
    if not label:
        return "Other"
    lower = label.lower()
    for cat in CATEGORIES:
        if cat.lower() in lower or cat.split()[0].lower() in lower:
            return cat
    return label
