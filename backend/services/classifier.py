import re
from typing import Optional
import structlog

from config import (
    CATEGORY_SEVERITY, CLASSIFICATION_THRESHOLD,
    ZERO_SHOT_CONFIDENCE_THRESHOLD, USE_ZERO_SHOT, HYPOTHESIS_TEMPLATES
)

log = structlog.get_logger()

# ─── Keyword / pattern library ────────────────────────────────────────────────
# Each entry: (regex_or_phrase, weight)
CATEGORY_PATTERNS: dict[str, list[tuple[str, float]]] = {
    "BALLOON_PAYMENT": [
        (r"\bballoon\s+payment\b", 0.95),
        (r"\bbullet\s+(?:repayment|payment)\b", 0.95),
        (r"\blump\s*[- ]?sum\s+(?:payment|repayment)\b", 0.90),
        (r"\bentire\s+(?:outstanding|principal)\s+(?:balance\s+)?(?:due|payable)\s+(?:at|on)\s+(?:maturity|end|expiry)", 0.90),
        (r"\bprincipal\s+(?:amount\s+)?(?:due|payable|repayable)\s+in\s+full\s+(?:at|on)\s+(?:maturity|end|expiry)", 0.88),
        (r"\bfinal\s+instalment\s+(?:shall\s+)?(?:comprise|include|consist\s+of)\b", 0.85),
        (r"\binterest[- ]only\s+(?:loan|repayment|instalments?)\b", 0.85),
        (r"\bnon[- ]?amortiz(?:ing|ation)\b", 0.85),
        (r"\bresidual\s+(?:amount|principal|balance)\s+(?:due|payable)\b", 0.80),
        (r"\bterminal\s+(?:payment|instalment)\b", 0.80),
        (r"\bend\s+of\s+(?:the\s+)?(?:term|tenure|loan\s+period)\s+(?:payment|amount|balance)\b", 0.80),
        (r"\bmaturity\s+(?:amount|payment|instalment)\b", 0.78),
        (r"\bpayment\s+in\s+full\s+(?:upon|at|on)\s+(?:maturity|expiry|termination)\b", 0.78),
        (r"\bsingle\s+payment\s+(?:of\s+)?(?:the\s+)?(?:entire|whole|full|outstanding)\b", 0.78),
        (r"\bpayable\s+at\s+(?:the\s+)?end\s+of\s+(?:the\s+)?(?:loan\s+)?(?:term|period|tenure)\b", 0.75),
        (r"\blump\s+sum\b", 0.60),
    ],
    "UNLAWFUL_PENALTY": [
        (r"\bprepayment\s+(?:penalty|charge|fee)\b", 0.92),
        (r"\bforeclosure\s+(?:penalty|charge|fee)\b", 0.92),
        (r"\bpre[- ]?closure\s+(?:charge|fee|penalty)\b", 0.92),
        (r"\bcompound(?:ed|ing)?\s+penal(?:ty)?\b", 0.92),
        (r"\bpenal(?:ty)?\s+(?:interest|charge)\s+(?:compound|shall\s+be\s+compound)\b", 0.92),
        (r"\bcompound(?:ed|ing)?\s+interest\s+(?:at|of)\s+(?:[\d.]+%|[\d.]+\s*per\s*cent)\s+(?:per\s+(?:month|annum))?\s*(?:compound|compounded)?\b", 0.88),
        (r"\bpenal\s+interest\s+(?:at|of)\s+(?:3[0-9]|[4-9]\d)%\b", 0.85),
        (r"\bdefault\s+interest\s+(?:at|of)\s+(?:3[0-9]|[4-9]\d)%\b", 0.85),
        (r"\blate\s+(?:payment|repayment)\s+(?:charge|penalty|fee)\b", 0.78),
        (r"\boverriding\s+(?:interest|charge)\b", 0.78),
        (r"\bentire\s+(?:outstanding|loan)\s+(?:amount\s+)?(?:immediately\s+)?(?:due\s+and\s+payable|become\s+payable)\b", 0.82),
        (r"\bacceleration\s+(?:of\s+)?(?:loan|debt|outstanding)\b", 0.80),
        (r"\bimmediately\s+due\s+and\s+payable\b", 0.78),
        (r"\bwhole\s+of\s+(?:the\s+)?outstanding\s+(?:amount|balance)\s+(?:shall\s+become|immediately)\b", 0.78),
        (r"\bliquidated\s+damages\b", 0.72),
        (r"\bexcessive\s+penalty\b", 0.72),
        (r"\bpenalt(?:y|ies)\s+(?:for|on)\s+default\b", 0.65),
        (r"\bpenalt(?:y|ies)\b", 0.45),
    ],
    "HIDDEN_FEE": [
        (r"\bcharges?\s+(?:as\s+)?applicable\b", 0.82),
        (r"\bcharges?\s+(?:as\s+)?determined\s+(?:by\s+the\s+(?:bank|lender))\b", 0.85),
        (r"\bfees?\s+(?:as\s+)?determined\s+(?:by\s+the\s+(?:bank|lender))\b", 0.85),
        (r"\b(?:charges?|fees?)\s+(?:may|shall)\s+(?:vary|change)\s+(?:from\s+time\s+to\s+time|without\s+(?:prior\s+)?notice)\b", 0.88),
        (r"\b(?:additional\s+)?charges?\s+without\s+(?:prior\s+)?notice\b", 0.88),
        (r"\binsurance\s+(?:premium|charge)\s+(?:as\s+)?(?:determined|decided|fixed)\s+by\s+(?:the\s+)?(?:bank|lender)\b", 0.85),
        (r"\bmandatory\s+(?:credit\s+life\s+)?insurance\b", 0.82),
        (r"\bdocumentation\s+(?:charge|fee)\b", 0.70),
        (r"\binspection\s+(?:charge|fee)\b", 0.70),
        (r"\badministration\s+(?:fee|charge)\b", 0.70),
        (r"\bfacility\s+(?:fee|charge)\b", 0.68),
        (r"\bcommitment\s+(?:fee|charge)\b", 0.68),
        (r"\bmanagement\s+(?:fee|charge)\b", 0.68),
        (r"\brenewal\s+(?:fee|charge)\b", 0.65),
        (r"\bhandling\s+(?:fee|charge)\b", 0.65),
        (r"\bservice\s+(?:tax|charge)\s+(?:and\s+)?(?:other\s+)?(?:levies|taxes|duties)\s+(?:as\s+)?applicable\b", 0.72),
        (r"\bas\s+(?:the\s+)?bank\s+may\s+(?:prescribe|levy|impose|charge)\b", 0.80),
        (r"\bfees?\s+and\s+charges?\s+(?:as\s+)?(?:amended|revised|updated)\s+from\s+time\s+to\s+time\b", 0.80),
        (r"\bdetermined\s+by\s+(?:the\s+)?(?:bank|lender)\s+from\s+time\s+to\s+time\b", 0.82),
        (r"\bpayable\s+as\s+applicable\s+and\s+as\s+determined\b", 0.82),
        (r"\bwithout\s+prior\s+notice\s+to\s+the\s+borrower\b", 0.78),
        (r"\bnot\s+limited\s+to\b.{0,60}\b(?:fee|charge|premium)\b", 0.72),
    ],
    "UNILATERAL_RATE_CHANGE": [
        (r"\b(?:bank|lender)\s+(?:may|shall|reserves?)\s+(?:the\s+)?(?:right\s+to\s+)?(?:revise|change|alter|modify|reset)\s+(?:the\s+)?interest\s+rate\b", 0.92),
        (r"\binterest\s+rate\s+(?:may\s+be|shall\s+be|is)\s+revised?\s+(?:by\s+the\s+)?(?:bank|lender)\b", 0.90),
        (r"\bat\s+(?:the\s+)?(?:bank|lender)'?s?\s+(?:sole\s+)?(?:and\s+absolute\s+)?discretion\b", 0.85),
        (r"\bwithout\s+(?:the\s+)?(?:prior\s+)?(?:consent|approval|notice|intimation)\s+(?:of|from)\s+(?:the\s+)?borrower\b", 0.88),
        (r"\bunilateral(?:ly)?\s+(?:revise|change|alter|modify)\b", 0.92),
        (r"\bsole\s+and\s+absolute\s+discretion\b", 0.82),
        (r"\b(?:bank|lender)\s+(?:may|shall)\s+(?:unilaterally|without\s+notice)\b", 0.88),
        (r"\binterest\s+rate\s+(?:is\s+)?subject\s+to\s+change\b", 0.78),
        (r"\b(?:bank|lender)\s+(?:may|reserves)\s+(?:the\s+)?right\s+to\s+vary\b", 0.80),
        (r"\brate\s+(?:of\s+interest\s+)?(?:may\s+be\s+)?revised?\s+without\s+(?:prior\s+)?notice\b", 0.88),
        (r"\binternal\s+benchmark\b", 0.75),
        (r"\bbase\s+rate\s+(?:as\s+)?(?:determined|fixed|decided)\s+by\s+(?:the\s+)?(?:bank|lender)\b", 0.80),
        (r"\bBPLR\b", 0.72),
        (r"\bspread\s+(?:may\s+be|shall\s+be)\s+revised?\b", 0.78),
        (r"\b(?:risk\s+)?premium\s+(?:may\s+vary|may\s+change|shall\s+vary)\b", 0.75),
        (r"\brate\s+reset\s+(?:at\s+the\s+)?(?:bank|lender)'?s?\s+discretion\b", 0.80),
    ],
    "COLLATERAL_OVERREACH": [
        (r"\b(?:all|entire)\s+(?:movable\s+and\s+immovable\s+)?(?:assets|property|properties)\s+of\s+(?:the\s+)?borrower\b", 0.92),
        (r"\bblanket\s+(?:lien|charge|mortgage)\b", 0.95),
        (r"\bgeneral\s+lien\b", 0.88),
        (r"\bcross[- ]?(?:collateral(?:ization)?|default)\b", 0.88),
        (r"\bpari\s+passu\s+charge\s+(?:over\s+all|on\s+all)\b", 0.85),
        (r"\bcharge\s+over\s+(?:all\s+)?(?:present\s+and\s+future\s+)?assets\b", 0.88),
        (r"\bright\s+of\s+set[- ]?off\b", 0.85),
        (r"\bbanker'?s?\s+lien\b", 0.85),
        (r"\bhypothecation\s+of\s+all\b", 0.85),
        (r"\bpledge\s+of\s+all\b", 0.82),
        (r"\bassets\s+not\s+(?:specified|mentioned|listed)\s+in\b", 0.85),
        (r"\bbeyond\s+(?:the\s+)?(?:specified|agreed|stated)\s+(?:collateral|security)\b", 0.85),
        (r"\b(?:seize|attach|appropriate)\s+(?:any\s+)?(?:other\s+)?(?:asset|property)\b", 0.82),
        (r"\bright\s+(?:to\s+)?(?:seize|appropriate|attach)\s+(?:all|any)\b", 0.82),
        (r"\ball\s+present\s+and\s+future\s+(?:assets|property)\b", 0.85),
        (r"\bdebit\s+(?:from\s+)?(?:any|all)\s+(?:account|deposit)\s+without\s+(?:prior\s+)?notice\b", 0.85),
        (r"\bset[- ]?off\s+(?:without|without\s+(?:prior\s+)?notice)\b", 0.88),
    ],
    "ARBITRATION_WAIVER": [
        (r"\birrevocably\s+waive[sd]?\b", 0.92),
        (r"\bwaiver\s+of\s+(?:the\s+)?right\s+to\s+(?:approach|file|sue|litigate|court)\b", 0.92),
        (r"\b(?:no\s+right|cannot|shall\s+not)\s+(?:to\s+)?(?:approach|file|institute)\s+(?:any\s+)?(?:suit|legal|proceedings?|court)\b", 0.92),
        (r"\bbinding\s+arbitration\s+(?:only|shall\s+be\s+(?:the\s+)?(?:sole|only|exclusive))\b", 0.88),
        (r"\bsole\s+(?:and\s+exclusive\s+)?(?:remedy|recourse)\s+(?:shall\s+be\s+)?arbitration\b", 0.88),
        (r"\barbitrator\s+(?:shall\s+be|to\s+be)\s+(?:appointed|nominated|selected)\s+(?:by|at\s+the\s+discretion\s+of)\s+(?:the\s+)?(?:bank|lender)\b", 0.92),
        (r"\bwaives?\s+(?:the\s+)?right\s+to\s+(?:appeal|court|ombudsman|judicial\s+review)\b", 0.88),
        (r"\bno\s+right\s+to\s+appeal\b", 0.88),
        (r"\bdecision\s+(?:of\s+the\s+arbitrator\s+)?(?:shall\s+be\s+)?final\s+and\s+binding\b", 0.75),
        (r"\bexclusive\s+arbitration\b", 0.82),
        (r"\bcannot\s+approach\s+(?:any\s+)?court\b", 0.92),
        (r"\bbanking\s+ombudsman\s+(?:jurisdiction\s+)?(?:excluded|not\s+applicable|waived)\b", 0.92),
        (r"\bforego[s]?\s+(?:the\s+)?right\s+to\s+(?:file|sue|litigate|approach)\b", 0.88),
        (r"\bwaiver\s+of\s+(?:jury\s+trial|judicial\s+proceedings?)\b", 0.85),
        (r"\bsole\s+arbitrator\s+(?:appointed|nominated)\s+by\s+(?:the\s+)?(?:bank|lender)\b", 0.92),
        (r"\bbank'?s?\s+nominee\s+as\s+(?:the\s+)?arbitrator\b", 0.92),
    ],
}


def _heuristic_score(text: str) -> dict[str, float]:
    """Compute per-category confidence score using keyword/regex patterns."""
    text_lower = text.lower()
    scores: dict[str, float] = {}
    for category, patterns in CATEGORY_PATTERNS.items():
        matched_weights = []
        for pattern, weight in patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                matched_weights.append(weight)
        if matched_weights:
            # Take max match weight, boost with additional matches
            base = max(matched_weights)
            bonus = min(0.15, 0.03 * (len(matched_weights) - 1))
            scores[category] = min(0.98, base + bonus)
    return scores


def _zero_shot_score(text: str, pipeline) -> dict[str, float]:
    """Run zero-shot classification for all 6 categories."""
    try:
        hypotheses = list(HYPOTHESIS_TEMPLATES.values())
        categories = list(HYPOTHESIS_TEMPLATES.keys())
        result = pipeline(
            text[:512],  # Truncate for speed
            candidate_labels=hypotheses,
            multi_label=True,
        )
        label_to_score = dict(zip(result["labels"], result["scores"]))
        scores: dict[str, float] = {}
        for cat, hyp in HYPOTHESIS_TEMPLATES.items():
            scores[cat] = label_to_score.get(hyp, 0.0)
        return scores
    except Exception as e:
        log.warning("Zero-shot classification failed", error=str(e))
        return {}


def classify_clauses(
    clauses: list[dict],
    zero_shot_pipeline=None,
) -> list[dict]:
    """
    Classify a list of clause dicts.
    Returns the same list with 'classification' field populated.
    """
    results = []
    for clause in clauses:
        text = clause.get("text", "")
        try:
            classification = _classify_single(text, zero_shot_pipeline)
            clause["classification"] = classification
        except Exception as e:
            log.warning("Classification failed for clause", clause_id=clause.get("clause_id"), error=str(e))
            clause["classification"] = {
                "is_predatory": False,
                "categories": [],
                "overall_confidence": 0.0,
                "status": "unanalyzed",
            }
        results.append(clause)
    return results


def _classify_single(text: str, zero_shot_pipeline=None) -> dict:
    heuristic_scores = _heuristic_score(text)

    final_scores: dict[str, float] = {}

    if USE_ZERO_SHOT and zero_shot_pipeline is not None:
        # Run zero-shot for categories with low heuristic confidence or no match
        low_confidence_cats = [
            cat for cat, score in heuristic_scores.items()
            if score < ZERO_SHOT_CONFIDENCE_THRESHOLD
        ]
        undetected_cats = [
            cat for cat in CATEGORY_PATTERNS
            if cat not in heuristic_scores
        ]
        cats_for_zero_shot = set(low_confidence_cats + undetected_cats)

        if cats_for_zero_shot:
            zs_scores = _zero_shot_score(text, zero_shot_pipeline)
            for cat in CATEGORY_PATTERNS:
                h_score = heuristic_scores.get(cat, 0.0)
                zs_score = zs_scores.get(cat, 0.0)
                if cat in cats_for_zero_shot:
                    # Ensemble: heuristic 0.4 + zero-shot 0.6
                    final_scores[cat] = 0.4 * h_score + 0.6 * zs_score
                else:
                    final_scores[cat] = h_score
        else:
            final_scores = heuristic_scores
    else:
        final_scores = heuristic_scores

    # Build category results above threshold
    categories = []
    for cat, score in final_scores.items():
        if score >= CLASSIFICATION_THRESHOLD:
            categories.append({
                "name": cat,
                "confidence": round(score, 3),
                "severity": CATEGORY_SEVERITY.get(cat, "MEDIUM"),
            })

    categories.sort(key=lambda x: x["confidence"], reverse=True)

    overall_confidence = max((c["confidence"] for c in categories), default=0.0)
    is_predatory = len(categories) > 0 and overall_confidence >= CLASSIFICATION_THRESHOLD

    return {
        "is_predatory": is_predatory,
        "categories": categories,
        "overall_confidence": round(overall_confidence, 3),
        "status": "analyzed",
    }
