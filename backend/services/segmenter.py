"""
Stage 2 — Clause Segmentation

Two-stage pipeline:
  1. Rule-based structural splitting — numbered headings, lettered sections,
     ALL-CAPS titles, bullets, schedule markers.
  2. Semantic paragraph merging — adjacent short fragments are merged so each
     clause contains at least one complete legal sentence.

Returns a list of clause strings, each ≥ MIN_CLAUSE_CHARS characters.
"""

import re
from typing import List

MIN_CLAUSE_CHARS = 40   # discard fragments shorter than this
MIN_CLAUSE_WORDS = 8    # discard fragments with fewer words


# ── Boundary patterns (in priority order) ────────────────────────────────────

_STRUCTURAL_PATTERNS = [
    # Numbered: 1.  1.1  1.1.1  (1)  1)
    re.compile(
        r"(?:^|\n)\s*"
        r"(?:\(?\d+(?:\.\d+)*\)?\s*[.):]?\s+)",
        re.MULTILINE,
    ),
    # Named sections: Clause 5, Section III, Article 2, Schedule A, Part IV
    re.compile(
        r"(?:^|\n)\s*"
        r"(?:Clause|Section|Article|Schedule|Annexure|Appendix|Part|Para)\s+"
        r"(?:\d+|[IVXLCDM]+|[A-Z])[.:]?\s",
        re.MULTILINE | re.IGNORECASE,
    ),
    # ALL-CAPS headings ≥ 4 chars on their own line
    re.compile(
        r"(?:^|\n)([A-Z][A-Z\s/\-&]{3,60})\n",
        re.MULTILINE,
    ),
    # Lettered sub-clauses: (a) (b) (i) (ii)
    re.compile(
        r"(?:^|\n)\s*\([a-z]{1,3}\)\s+",
        re.MULTILINE,
    ),
    # Bullet points: •  –  *  ►
    re.compile(
        r"(?:^|\n)\s*[•\-\*►]\s+",
        re.MULTILINE,
    ),
]

_SCHEDULE_PATTERN = re.compile(
    r"(?:^|\n)\s*(?:SCHEDULE|ANNEXURE|APPENDIX)\s+[A-Z0-9]+",
    re.IGNORECASE | re.MULTILINE,
)


def segment_clauses(text: str) -> List[str]:
    """Split a document into individual clause strings."""
    if not text or not text.strip():
        return []

    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Try structural splitting
    clauses = _structural_split(text)

    # If structure yields only one block, fall back to paragraph splitting
    if len(clauses) <= 2:
        clauses = _paragraph_split(text)

    # Post-process: merge tiny fragments, filter junk
    clauses = _merge_fragments(clauses)
    clauses = [c.strip() for c in clauses if _is_valid_clause(c)]

    return clauses


# ── Splitting strategies ──────────────────────────────────────────────────────

def _structural_split(text: str) -> List[str]:
    """Find all boundary positions, then slice text between them."""
    boundaries = set()

    for pattern in _STRUCTURAL_PATTERNS:
        for m in pattern.finditer(text):
            boundaries.add(m.start())

    # Also treat schedule/annexure markers as hard boundaries
    for m in _SCHEDULE_PATTERN.finditer(text):
        boundaries.add(m.start())

    if not boundaries:
        return [text]

    positions = sorted(boundaries)
    chunks = []
    for i, pos in enumerate(positions):
        end = positions[i + 1] if i + 1 < len(positions) else len(text)
        chunks.append(text[pos:end])

    # Prepend any text before the first boundary
    if positions[0] > 0:
        chunks.insert(0, text[: positions[0]])

    return chunks


def _paragraph_split(text: str) -> List[str]:
    """Fall back: split on double newlines (paragraph breaks)."""
    return re.split(r"\n\s*\n", text)


# ── Post-processing ───────────────────────────────────────────────────────────

def _merge_fragments(clauses: List[str]) -> List[str]:
    """Merge short trailing fragments into the preceding clause."""
    merged: List[str] = []
    for chunk in clauses:
        chunk = chunk.strip()
        if not chunk:
            continue
        if merged and len(chunk) < MIN_CLAUSE_CHARS:
            merged[-1] = merged[-1] + "\n" + chunk
        else:
            merged.append(chunk)
    return merged


def _is_valid_clause(text: str) -> bool:
    """Return True if the text looks like a real clause, not a header/junk."""
    stripped = text.strip()
    if len(stripped) < MIN_CLAUSE_CHARS:
        return False
    words = stripped.split()
    if len(words) < MIN_CLAUSE_WORDS:
        return False
    # Discard pure numeric or single-word lines
    if re.fullmatch(r"[\d\s.,;:–\-/]+", stripped):
        return False
    return True


def _normalize_whitespace(s: str) -> str:
    return re.sub(r"[ \t]+", " ", s)
