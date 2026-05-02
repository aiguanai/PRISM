import re
from typing import Optional
import structlog

from services.classifier import CATEGORY_PATTERNS

log = structlog.get_logger()


def _normalize_scores(scores: dict[str, float]) -> dict[str, float]:
    if not scores:
        return scores
    max_score = max(scores.values())
    if max_score == 0:
        return scores
    return {k: round(v / max_score, 4) for k, v in scores.items()}


def _score_tokens(text: str, categories: list[dict]) -> list[tuple[int, int, str, float]]:
    """
    Score each word/token in the text for saliency.
    Returns list of (start, end, token_text, score).
    """
    if not categories:
        return []

    relevant_categories = [c["name"] for c in categories]
    word_scores: dict[tuple[int, int], float] = {}

    for category in relevant_categories:
        patterns = CATEGORY_PATTERNS.get(category, [])
        for pattern, weight in patterns:
            try:
                for m in re.finditer(pattern, text, re.IGNORECASE):
                    start, end = m.start(), m.end()
                    span_key = (start, end)
                    word_scores[span_key] = max(word_scores.get(span_key, 0), weight)
            except re.error:
                pass

    # If few direct matches, fall back to word-level keyword scoring
    if len(word_scores) < 3:
        all_trigger_words: set[str] = set()
        for category in relevant_categories:
            for pat, _ in CATEGORY_PATTERNS.get(category, []):
                # Extract literal words from pattern (crude but effective)
                words = re.findall(r'[a-zA-Z]{4,}', pat)
                all_trigger_words.update(w.lower() for w in words)

        for m in re.finditer(r'\b\w+\b', text):
            word = m.group(0).lower()
            if word in all_trigger_words:
                start, end = m.start(), m.end()
                word_scores[(start, end)] = max(word_scores.get((start, end), 0), 0.65)

    return [(s, e, text[s:e], sc) for (s, e), sc in word_scores.items()]


def explain_clause(clause_id: str, text: str, categories: list[dict]) -> dict:
    """
    Extract top-5 highlighted spans that drove the classification.
    """
    try:
        span_list = _score_tokens(text, categories)
        # Sort by score desc, deduplicate overlapping spans
        span_list.sort(key=lambda x: x[3], reverse=True)

        # Merge very close/overlapping spans
        merged: list[tuple[int, int, str, float]] = []
        for start, end, token, score in span_list:
            overlap = False
            for i, (ms, me, mt, msc) in enumerate(merged):
                if start < me and end > ms:
                    # Extend span to cover both
                    new_start = min(ms, start)
                    new_end = max(me, end)
                    merged[i] = (new_start, new_end, text[new_start:new_end], max(msc, score))
                    overlap = True
                    break
            if not overlap:
                merged.append((start, end, token, score))

        merged.sort(key=lambda x: x[3], reverse=True)
        top_spans = merged[:5]

        normalized_scores = _normalize_scores({f"{s}_{e}": sc for s, e, _, sc in top_spans})
        highlighted_spans = []
        for (start, end, token, raw_score) in top_spans:
            norm_score = normalized_scores.get(f"{start}_{end}", raw_score)
            highlighted_spans.append({
                "text": token,
                "start": start,
                "end": end,
                "importance_score": round(norm_score, 4),
            })

        # Sort by position for consistent display
        highlighted_spans.sort(key=lambda x: x["start"])

        return {
            "clause_id": clause_id,
            "highlighted_spans": highlighted_spans,
        }
    except Exception as e:
        log.warning("Explainer failed", clause_id=clause_id, error=str(e))
        return {"clause_id": clause_id, "highlighted_spans": []}
