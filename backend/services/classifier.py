"""
Clause classifier.

Two modes:
  - heuristic (default): keyword-based, no model needed.
  - ml: HuggingFace pipeline loaded from ML_MODEL_DIR.

Set CLASSIFIER_MODE=ml and ML_MODEL_DIR=../model to use the trained weights.
Falls back to heuristic if weights are missing or fail to load.
"""
import os
from typing import Dict

# The 7 PRISM predatory-risk labels produced by the trained model
CATEGORIES = [
    "SAFE",
    "UNLAWFUL_PENALTY",
    "HIDDEN_FEE",
    "UNILATERAL_RATE_CHANGE",
    "COLLATERAL_OVERREACH",
    "ARBITRATION_WAIVER",
    "BALLOON_PAYMENT",
]

# Keywords for heuristic fallback AND for the explainer
CATEGORY_KEYWORDS: Dict[str, list] = {
    "UNLAWFUL_PENALTY": [
        "penalty", "penal interest", "prepayment penalty", "foreclosure charge",
        "late fee", "default interest", "overdue", "liquidated damages",
        "compounding", "compound penal", "pre-closure",
    ],
    "HIDDEN_FEE": [
        "additional charges as applicable", "charges as determined",
        "fees as determined", "processing fee", "documentation fee",
        "charges may vary", "without prior notice", "at lender's discretion",
        "as the bank may determine",
    ],
    "UNILATERAL_RATE_CHANGE": [
        "sole discretion", "without prior notice", "may revise the interest",
        "at any time", "unilaterally", "may change the rate",
        "internal benchmark", "without borrower consent",
    ],
    "COLLATERAL_OVERREACH": [
        "blanket lien", "all assets", "present and future assets",
        "right of set-off", "general lien", "hypothecation of all",
        "cross-collateral", "seize", "beyond the loan",
    ],
    "ARBITRATION_WAIVER": [
        "arbitration", "sole arbitrator", "appointed by the bank",
        "irrevocably waive", "no right to appeal", "waives any right",
        "binding arbitration only", "banking ombudsman",
    ],
    "BALLOON_PAYMENT": [
        "balloon payment", "lump sum", "bullet payment", "maturity payment",
        "final instalment", "residual amount", "entire principal at end",
        "non-amortizing", "interest-only",
    ],
}

CLASSIFIER_MODE = os.getenv("CLASSIFIER_MODE", "heuristic").lower()
# Model lives at PRISM/model/ — one level up from backend/
ML_MODEL_DIR = os.getenv("ML_MODEL_DIR", "../model")

_ml_pipeline = None
_ml_available = False


def warmup_model() -> None:
    """Called at startup. Loads the ML model if ML mode is requested."""
    global _ml_pipeline, _ml_available

    if CLASSIFIER_MODE != "ml":
        print("[classifier] Mode: heuristic (set CLASSIFIER_MODE=ml to use trained weights)")
        return

    if not os.path.isdir(ML_MODEL_DIR):
        print(
            f"[classifier] ML mode requested but weights not found at '{ML_MODEL_DIR}'. "
            "Falling back to heuristic."
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
        print(f"[classifier] Loaded model from '{ML_MODEL_DIR}'")
    except Exception as exc:
        print(f"[classifier] Failed to load ML model ({exc}). Falling back to heuristic.")
        _ml_pipeline = None
        _ml_available = False


def classify_clauses_batch(clauses: list) -> list:
    """
    Classify a list of clauses in one batched model call.
    10-20x faster on CPU than calling classify_clause() in a loop.
    Returns list of { "label", "confidence" } in the same order.
    """
    if not clauses:
        return []

    if _ml_available and _ml_pipeline is not None:
        try:
            truncated = [c[:512] if c else "" for c in clauses]
            batch_out = _ml_pipeline(truncated, batch_size=16)
            return [
                {
                    "label":      _normalize_label(r.get("label", "SAFE")),
                    "confidence": round(float(r.get("score", 0.0)), 2),
                }
                for r in batch_out
            ]
        except Exception:
            pass

    return [_classify_heuristic(c) for c in clauses]


def classify_clause(clause: str) -> Dict:
    """Single-clause convenience wrapper."""
    if not clause or not clause.strip():
        return {"label": "SAFE", "confidence": 0.0}

    if _ml_available and _ml_pipeline is not None:
        try:
            result = _ml_pipeline(clause[:512])[0]
            label = _normalize_label(result.get("label", "SAFE"))
            return {"label": label, "confidence": round(float(result.get("score", 0.0)), 2)}
        except Exception:
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
        return {"label": "SAFE", "confidence": 0.80}

    best = max(scores, key=lambda k: scores[k])
    total = sum(scores.values())
    confidence = min(0.95, 0.50 + (scores[best] / max(total, 1)) * 0.45)
    return {"label": best, "confidence": round(confidence, 2)}


def _normalize_label(label: str) -> str:
    """Pass through model labels directly — they already use PRISM category names."""
    if label in CATEGORIES:
        return label
    # Handle any LABEL_N format from models that didn't set label2id correctly
    upper = label.upper().replace("-", "_").replace(" ", "_")
    for cat in CATEGORIES:
        if cat in upper:
            return cat
    return "SAFE"
