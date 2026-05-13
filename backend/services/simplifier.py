"""
Converts legalese into plain English with simple substitutions.

This is intentionally lightweight — no LLM call. A more powerful simplifier
can be plugged in later behind the same `simplify_clause(text) -> str` API.
"""
import re

SUBSTITUTIONS = [
    (r"\bhereinafter\b",      "from now on"),
    (r"\bhereto\b",           "to this"),
    (r"\bherein\b",           "in this"),
    (r"\btherein\b",          "in that"),
    (r"\bwhereof\b",          "of which"),
    (r"\bwhereas\b",          "given that"),
    (r"\bnotwithstanding\b",  "despite"),
    (r"\bpursuant to\b",      "according to"),
    (r"\bsubject to\b",       "depending on"),
    (r"\bshall\b",            "must"),
    (r"\bin lieu of\b",       "instead of"),
    (r"\bprior to\b",         "before"),
    (r"\bsubsequent to\b",    "after"),
    (r"\baforementioned\b",   "above"),
    (r"\bsaid\b",             "that"),
    (r"\bex parte\b",         "from one side"),
    (r"\bbona fide\b",        "in good faith"),
    (r"\bper annum\b",        "per year"),
    (r"\bp\.a\.",             "per year"),
    (r"\bindemnify\b",        "compensate"),
    (r"\bindemnification\b",  "compensation"),
    (r"\barbitration\b",      "private dispute resolution"),
    (r"\barbitrator\b",       "private judge"),
    (r"\bterminate\b",        "end"),
    (r"\btermination\b",      "ending"),
    (r"\bforthwith\b",        "immediately"),
    (r"\bsole discretion\b",  "their own choice"),
]

MAX_SIMPLIFIED_LEN = 400


def simplify_clause(text: str) -> str:
    """Return a plain-English version of `text` (best-effort, length-capped)."""
    if not text:
        return text

    simplified = text
    for pattern, replacement in SUBSTITUTIONS:
        simplified = re.sub(pattern, replacement, simplified, flags=re.IGNORECASE)

    simplified = re.sub(r"\s+", " ", simplified).strip()

    if len(simplified) > MAX_SIMPLIFIED_LEN:
        simplified = simplified[: MAX_SIMPLIFIED_LEN - 3] + "..."
    return simplified
