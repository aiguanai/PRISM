import re
import uuid
from typing import Optional
from dataclasses import dataclass, field

import structlog

log = structlog.get_logger()

# Heading patterns (ordered by specificity)
CLAUSE_PATTERNS = [
    # Numbered sections: 1., 1.1, 1.1.1
    re.compile(r'^(\d+\.(?:\d+\.?)*)\s+(.+)', re.MULTILINE),
    # Clause N / Section N / Article N
    re.compile(r'^((?:Clause|Section|Article|Schedule|Annexure|Appendix)\s+[A-Z0-9]+(?:\.\d+)*)[:\.\s]\s*(.*)$',
               re.MULTILINE | re.IGNORECASE),
    # Roman numerals: I. II. III.
    re.compile(r'^([IVXLCivxlc]{1,6}\.)\s+(.+)', re.MULTILINE),
    # ALL CAPS heading (min 4 chars, no digits-only)
    re.compile(r'^([A-Z][A-Z\s\-/&]{3,60})$', re.MULTILINE),
    # (a), (b), (i), (ii) sub-clauses
    re.compile(r'^\(([a-z]{1,3}|[ivxlc]{1,4})\)\s+(.+)', re.MULTILINE),
]

MIN_CLAUSE_LENGTH = 30
MAX_SEMANTIC_CHUNK = 200


@dataclass
class RawBlock:
    text: str
    heading: Optional[str]
    char_start: int
    char_end: int


def _find_rule_based_boundaries(text: str) -> list[RawBlock]:
    """Stage 1: Split text at numbered/headed boundaries."""
    matches = []
    for pattern in CLAUSE_PATTERNS[:4]:  # skip sub-clause for boundary detection
        for m in pattern.finditer(text):
            matches.append((m.start(), m))

    if not matches:
        return []

    # Sort by position, deduplicate overlapping
    matches.sort(key=lambda x: x[0])
    deduplicated = []
    last_end = -1
    for pos, m in matches:
        if pos >= last_end:
            deduplicated.append((pos, m))
            last_end = pos + len(m.group(0))

    blocks: list[RawBlock] = []
    for i, (pos, m) in enumerate(deduplicated):
        start = m.start()
        # Text until next boundary (or end of document)
        end = deduplicated[i + 1][0] if i + 1 < len(deduplicated) else len(text)
        block_text = text[start:end].strip()
        # Extract heading from first line
        first_line = block_text.split('\n', 1)[0].strip()
        heading = first_line if len(first_line) <= 120 else None
        if len(block_text) >= MIN_CLAUSE_LENGTH:
            blocks.append(RawBlock(
                text=block_text,
                heading=heading,
                char_start=start,
                char_end=end,
            ))

    return blocks


def _semantic_split(text: str, start_offset: int, model) -> list[RawBlock]:
    """Stage 2: Use sentence embeddings to split large unstructured text."""
    import numpy as np
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    sentences = [s.strip() for s in sentences if s.strip()]
    if len(sentences) <= 2:
        return [RawBlock(text=text, heading=None,
                         char_start=start_offset, char_end=start_offset + len(text))]

    try:
        embeddings = model.encode(sentences, show_progress_bar=False)
        blocks: list[RawBlock] = []
        current_sents = [sentences[0]]
        current_start = start_offset

        for i in range(1, len(sentences)):
            cos_sim = float(np.dot(embeddings[i - 1], embeddings[i]) /
                            (np.linalg.norm(embeddings[i - 1]) * np.linalg.norm(embeddings[i]) + 1e-8))
            if cos_sim < 0.35 and len(' '.join(current_sents)) >= MIN_CLAUSE_LENGTH:
                chunk = ' '.join(current_sents)
                chunk_end = current_start + len(chunk)
                blocks.append(RawBlock(text=chunk, heading=None,
                                       char_start=current_start, char_end=chunk_end))
                current_start = chunk_end + 1
                current_sents = [sentences[i]]
            else:
                current_sents.append(sentences[i])

        if current_sents:
            chunk = ' '.join(current_sents)
            blocks.append(RawBlock(text=chunk, heading=None,
                                   char_start=current_start,
                                   char_end=current_start + len(chunk)))
        return blocks
    except Exception as e:
        log.warning("Semantic split failed, keeping block whole", error=str(e))
        return [RawBlock(text=text, heading=None,
                         char_start=start_offset, char_end=start_offset + len(text))]


def _merge_short_blocks(blocks: list[RawBlock]) -> list[RawBlock]:
    """Merge fragments shorter than MIN_CLAUSE_LENGTH with adjacent clause."""
    if not blocks:
        return blocks
    merged: list[RawBlock] = []
    for block in blocks:
        if len(block.text.strip()) < MIN_CLAUSE_LENGTH and merged:
            prev = merged[-1]
            merged[-1] = RawBlock(
                text=prev.text + ' ' + block.text,
                heading=prev.heading,
                char_start=prev.char_start,
                char_end=block.char_end,
            )
        else:
            merged.append(block)
    return merged


def segment_clauses(text: str, sentence_model=None) -> list[dict]:
    """
    Main segmentation pipeline.
    Returns list of clause dicts matching the Clause schema.
    """
    if not text or not text.strip():
        return []

    blocks = _find_rule_based_boundaries(text)

    if not blocks:
        # No rule-based boundaries found — treat whole text as one block for semantic split
        blocks = [RawBlock(text=text, heading=None, char_start=0, char_end=len(text))]

    # Stage 2: Semantically split large unstructured blocks
    final_blocks: list[RawBlock] = []
    for block in blocks:
        if len(block.text) > MAX_SEMANTIC_CHUNK and sentence_model is not None and block.heading is None:
            sub_blocks = _semantic_split(block.text, block.char_start, sentence_model)
            final_blocks.extend(sub_blocks)
        else:
            final_blocks.append(block)

    final_blocks = _merge_short_blocks(final_blocks)

    clauses = []
    for idx, block in enumerate(final_blocks):
        clause_id = f"clause_{idx + 1:03d}"
        # Determine page reference (rough: assume ~2000 chars per page)
        page_ref = max(1, block.char_start // 2000 + 1)
        clauses.append({
            "clause_id": clause_id,
            "text": block.text.strip(),
            "page_ref": page_ref,
            "char_start": block.char_start,
            "char_end": block.char_end,
            "heading": block.heading,
        })

    log.info("Segmentation complete", total_clauses=len(clauses))
    return clauses
