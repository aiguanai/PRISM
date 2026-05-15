"""
Stage 6a — Plain-Language Simplification

Converts dense legal clause text into 1-2 simple sentences an MSME
business owner can understand immediately.

Priority:
  1. OpenAI gpt-4o-mini  (if OPENAI_API_KEY is set) — best quality
  2. Rule-based substitutions                        — always available
"""

import os
import re
from typing import Optional

OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

_SYSTEM_PROMPT = (
    "You are a legal literacy expert helping Indian MSME business owners "
    "understand loan agreement clauses. Given a clause and its risk category, "
    "write 1-2 simple sentences explaining:\n"
    "  (a) what the clause means for the borrower, and\n"
    "  (b) why it may be harmful.\n"
    "Use plain English. No legal jargon. Be direct and specific to the clause text."
)

# ── Substitution table for rule-based fallback ─────────────────────────────

_SUBS = [
    (r"\bhereinafter\b",         "from now on"),
    (r"\bhereto\b",              "to this"),
    (r"\bherein\b",              "in this"),
    (r"\btherein\b",             "in that"),
    (r"\bwhereof\b",             "of which"),
    (r"\bwhereas\b",             "given that"),
    (r"\bnotwithstanding\b",     "despite"),
    (r"\bpursuant to\b",         "according to"),
    (r"\bsubject to\b",          "depending on"),
    (r"\bshall\b",               "must"),
    (r"\bin lieu of\b",          "instead of"),
    (r"\bprior to\b",            "before"),
    (r"\bsubsequent to\b",       "after"),
    (r"\baforementioned\b",      "above-mentioned"),
    (r"\bsaid\b",                "that"),
    (r"\bex parte\b",            "from one side only"),
    (r"\bbona fide\b",           "in good faith"),
    (r"\bper annum\b",           "per year"),
    (r"\bp\.a\.",                "per year"),
    (r"\bindemnify\b",           "compensate"),
    (r"\bindemnification\b",     "compensation"),
    (r"\barbitration\b",         "private dispute resolution"),
    (r"\barbitrator\b",          "private judge"),
    (r"\bterminate\b",           "end"),
    (r"\btermination\b",         "ending"),
    (r"\bforthwith\b",           "immediately"),
    (r"\bsole discretion\b",     "their own choice alone"),
    (r"\blien\b",                "legal claim over your assets"),
    (r"\bhypothecation\b",       "using your assets as security"),
    (r"\bforeclosure\b",         "forced early repayment"),
    (r"\bpari passu\b",          "on equal terms"),
    (r"\bmortgagor\b",           "the borrower"),
    (r"\bmortgagee\b",           "the lender"),
    (r"\bobligor\b",             "the borrower"),
    (r"\bobligee\b",             "the lender"),
]

_MAX_LEN = 500


# ── Public API ─────────────────────────────────────────────────────────────────

def simplify_clause(clause: str, label: str = "") -> str:
    """Return a plain-English version of the clause using rule-based substitutions."""
    if not clause or not clause.strip():
        return ""
    return _rule_simplify(clause)


# ── GPT simplification ────────────────────────────────────────────────────────

def _gpt_simplify(clause: str, label: str) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)

    label_display = label.replace("_", " ").title() if label else "unknown"
    user_msg = f"Risk category: {label_display}\n\nClause:\n\"{clause[:600]}\""

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": user_msg},
        ],
        temperature=0.3,
        max_tokens=200,
    )
    return resp.choices[0].message.content.strip()


# ── Rule-based fallback ────────────────────────────────────────────────────────

def _rule_simplify(clause: str) -> str:
    """Replace legalese with plain equivalents and cap length."""
    text = clause
    for pattern, replacement in _SUBS:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > _MAX_LEN:
        text = text[:_MAX_LEN - 3] + "..."
    return text
