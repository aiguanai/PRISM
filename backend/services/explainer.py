"""
Stage 5 — Explainability

Two outputs per flagged clause:
  1. explanation  — one-sentence human-readable reason for the flag
  2. highlights   — list of token spans that drove the classification,
                    analogous to SHAP token attribution

In ML mode: attention-based token importance (when pipeline object passed in).
In heuristic mode: keyword saliency — tokens that match classifier keywords
  are scored by keyword weight and proximity to other matches.
"""

from services.classifier import CATEGORY_KEYWORDS

# ── Explanation templates ─────────────────────────────────────────────────────

EXPLANATION_TEMPLATES = {
    "UNLAWFUL_PENALTY": (
        "Contains penalty or charge language ({hits}). "
        "Check whether the penalty exceeds RBI-permitted limits or is compounded."
    ),
    "HIDDEN_FEE": (
        "References charges or fees ({hits}) that may not be disclosed upfront. "
        "RBI's KFS mandate requires all fees to be stated before signing."
    ),
    "UNILATERAL_RATE_CHANGE": (
        "Gives the lender discretion over the interest rate ({hits}). "
        "RBI requires prior notice and prohibits silent rate revisions on MSME loans."
    ),
    "COLLATERAL_OVERREACH": (
        "Relates to security, lien, or indemnity ({hits}). "
        "Verify collateral is limited to what was agreed in the sanction letter."
    ),
    "ARBITRATION_WAIVER": (
        "Addresses dispute resolution ({hits}). "
        "Confirm the borrower retains the right to approach courts and the RBI Banking Ombudsman."
    ),
    "BALLOON_PAYMENT": (
        "Describes a repayment structure with a large final amount ({hits}). "
        "Check whether the balloon payment is clearly disclosed and matches the borrower's cash flow."
    ),
    "SAFE": (
        "No predatory signals detected. Standard fair-practice language."
    ),
    "Other": (
        "No strong category signals; treated as general contractual content."
    ),
}


# ── Public API ────────────────────────────────────────────────────────────────

def explain_clause(clause: str, label: str) -> str:
    """Return a one-sentence explanation for the given classification label."""
    keywords = CATEGORY_KEYWORDS.get(label, [])
    text     = (clause or "").lower()
    hits     = [kw for kw in keywords if kw in text]
    hits_str = ", ".join(f'"{h}"' for h in hits[:4]) if hits else "general clause language"
    template = EXPLANATION_TEMPLATES.get(label, EXPLANATION_TEMPLATES["Other"])
    return template.format(hits=hits_str)


def get_highlights(clause: str, label: str, ml_pipeline=None) -> list:
    """
    Return a list of token spans that explain the classification.

    Each span: { "text": str, "start": int, "end": int, "score": float }

    If ml_pipeline is provided and supports attention extraction, uses
    attention-weighted saliency. Otherwise falls back to keyword saliency.
    """
    if ml_pipeline is not None:
        try:
            return _attention_highlights(clause, label, ml_pipeline)
        except Exception:
            pass
    return _keyword_highlights(clause, label)


# ── Attention-based attribution (ML mode) ────────────────────────────────────

def _attention_highlights(clause: str, _label: str, pipeline) -> list:
    """
    Extract token-level importance from the model's last attention layer.
    Uses the mean attention weight across all heads in the final layer.
    """
    import torch  # noqa: F401  (optional dep)

    model     = pipeline.model
    tokenizer = pipeline.tokenizer

    inputs   = tokenizer(clause[:512], return_tensors="pt", truncation=True)
    with torch.no_grad():
        outputs = model(**inputs, output_attentions=True)

    # Average attention across heads in the last layer: shape (seq_len, seq_len)
    last_layer = outputs.attentions[-1].squeeze(0)   # (heads, seq, seq)
    mean_attn  = last_layer.mean(dim=0)              # (seq, seq)
    # CLS token attention to every other token
    cls_attn = mean_attn[0, 1:].cpu().numpy()        # exclude CLS itself

    tokens = tokenizer.convert_ids_to_tokens(inputs["input_ids"][0][1:])
    # Map subword tokens back to character spans
    spans  = _tokens_to_char_spans(clause, tokens, tokenizer)

    # Normalise scores
    if cls_attn.max() > 0:
        cls_attn = cls_attn / cls_attn.max()

    highlights = []
    for token, span, score in sorted(
        zip(tokens, spans, cls_attn),
        key=lambda x: x[2],
        reverse=True,
    )[:8]:
        if span is None or score < 0.3:
            continue
        highlights.append({
            "text":  clause[span[0]:span[1]],
            "start": span[0],
            "end":   span[1],
            "score": round(float(score), 3),
        })

    return sorted(highlights, key=lambda h: h["start"])


def _tokens_to_char_spans(text: str, tokens: list, tokenizer) -> list:
    """Map BERT subword tokens back to (start, end) character positions in text."""
    spans  = []
    cursor = 0
    lower  = text.lower()

    for token in tokens:
        clean = token.replace("▁", "").replace("##", "").replace("Ġ", "")
        if not clean or token in ("[SEP]", "[PAD]", "[UNK]"):
            spans.append(None)
            continue

        pos = lower.find(clean, cursor)
        if pos == -1:
            spans.append(None)
        else:
            spans.append((pos, pos + len(clean)))
            cursor = pos + 1

    return spans


# ── Keyword saliency (heuristic / fallback mode) ─────────────────────────────

def _keyword_highlights(clause: str, label: str) -> list:
    """
    Score each word position by whether it or its neighbourhood contains
    a category keyword. Returns the top-N spans sorted by position.
    """
    keywords = CATEGORY_KEYWORDS.get(label, [])
    if not keywords:
        return []

    clause_lower = clause.lower()
    raw: list = []

    for kw in keywords:
        idx = 0
        while True:
            pos = clause_lower.find(kw, idx)
            if pos == -1:
                break
            raw.append({
                "text":  clause[pos: pos + len(kw)],
                "start": pos,
                "end":   pos + len(kw),
                "score": 0.85,
            })
            idx = pos + 1

    # Merge overlapping spans
    raw.sort(key=lambda x: x["start"])
    merged: list = []
    for span in raw:
        if merged and span["start"] < merged[-1]["end"]:
            # Extend the previous span
            merged[-1]["end"]  = max(merged[-1]["end"],  span["end"])
            merged[-1]["text"] = clause[merged[-1]["start"]: merged[-1]["end"]]
            merged[-1]["score"] = max(merged[-1]["score"], span["score"])
        else:
            merged.append(dict(span))

    return merged[:10]
