"""
Splits a legal document into individual clauses.

Heuristics (in priority order):
  1. Numbered headings — "1.", "1.1", "(1)", "Article 3", "Section 4", "Clause 5"
  2. Bullet markers   — "•", "-", "*"
  3. Blank-line paragraph breaks (fallback)
"""
import re
from typing import List

NUMBERED_RE = re.compile(
    r"(?:^|\n)\s*("
    r"\(?\d+(?:\.\d+)*\)?\s*[.)]"            # 1.  1.1  (1)
    r"|(?:Article|Section|Clause|Para)\s+\d+[.:]?"  # Article 5
    r")",
    re.IGNORECASE,
)
BULLET_RE = re.compile(r"(?:^|\n)\s*[•\-\*]\s+")

MIN_CLAUSE_LEN = 20  # filter out junk fragments


def segment_clauses(text: str) -> List[str]:
    """Return a list of clause strings extracted from `text`."""
    if not text or not text.strip():
        return []

    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # 1. Try numbered/structured splits
    splits = _split_keep_delimiter(text, NUMBERED_RE)

    # 2. If structure not found, try bullets
    if len(splits) <= 1:
        splits = _split_keep_delimiter(text, BULLET_RE)

    # 3. Final fallback: split on blank lines
    if len(splits) <= 1:
        splits = re.split(r"\n\s*\n", text)

    clauses: List[str] = []
    for chunk in splits:
        c = _normalize_whitespace(chunk).strip()
        if len(c) >= MIN_CLAUSE_LEN:
            clauses.append(c)
    return clauses


def _split_keep_delimiter(text: str, pattern: re.Pattern) -> List[str]:
    """Split by `pattern` but keep each match attached to the following chunk."""
    matches = list(pattern.finditer(text))
    if not matches:
        return [text]

    chunks: List[str] = []
    start = 0
    for m in matches:
        if m.start() > start:
            chunks.append(text[start:m.start()])
        start = m.start()
    chunks.append(text[start:])
    return [c for c in chunks if c.strip()]


def _normalize_whitespace(s: str) -> str:
    return re.sub(r"[ \t]+", " ", s)
