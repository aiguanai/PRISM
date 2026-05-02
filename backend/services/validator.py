import json
import re
from pathlib import Path
from typing import Optional

import structlog

from config import RBI_RULES_FILE

log = structlog.get_logger()


class ValidationError(Exception):
    pass


_RULES_CACHE: Optional[list[dict]] = None


def _load_rules() -> list[dict]:
    global _RULES_CACHE
    if _RULES_CACHE is not None:
        return _RULES_CACHE
    try:
        with open(RBI_RULES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        _RULES_CACHE = data.get("rules", [])
        log.info("RBI rules loaded", count=len(_RULES_CACHE))
        return _RULES_CACHE
    except Exception as e:
        log.error("Failed to load RBI rules", error=str(e))
        return []


def _text_matches_keywords(text: str, keywords: list[str]) -> bool:
    text_lower = text.lower()
    for kw in keywords:
        if kw.lower() in text_lower:
            return True
    return False


def validate_clause(clause_text: str, categories: list[dict]) -> list[dict]:
    """
    Cross-check a clause against RBI rules.
    Only runs rules relevant to the detected categories.
    Returns list of regulatory results.
    """
    rules = _load_rules()
    if not rules:
        return []

    detected_category_names = {c["name"] for c in categories}
    results = []

    for rule in rules:
        rule_category = rule.get("category", "")
        trigger_keywords = rule.get("trigger_keywords", [])

        # Match by category alignment
        category_match = rule_category in detected_category_names

        # Match by keyword presence in clause text
        keyword_match = _text_matches_keywords(clause_text, trigger_keywords)

        if not (category_match or keyword_match):
            continue

        # Determine verdict
        verdict = rule.get("verdict_if_triggered", "POSSIBLE_VIOLATION")
        # Downgrade to POSSIBLE_VIOLATION if only keyword-matched without category match
        if keyword_match and not category_match:
            verdict = "POSSIBLE_VIOLATION"

        results.append({
            "rule_id": rule["id"],
            "rule_description": rule["description"],
            "verdict": verdict,
            "source": rule.get("source", ""),
            "plain_rule": rule.get("plain_rule", ""),
        })

    # Sort: VIOLATION first, then POSSIBLE_VIOLATION
    verdict_order = {"VIOLATION": 0, "POSSIBLE_VIOLATION": 1, "COMPLIANT": 2}
    results.sort(key=lambda r: verdict_order.get(r["verdict"], 3))
    return results


async def validate_clauses_parallel(analyzed_clauses: list[dict]) -> list[dict]:
    """Validate all flagged clauses in parallel using asyncio.gather."""
    import asyncio

    async def validate_one(clause_data: dict) -> dict:
        classification = clause_data.get("classification", {})
        if not classification.get("is_predatory"):
            clause_data["regulatory_results"] = []
            return clause_data
        categories = classification.get("categories", [])
        text = clause_data.get("clause", {}).get("text", "")
        clause_data["regulatory_results"] = validate_clause(text, categories)
        return clause_data

    tasks = [validate_one(c) for c in analyzed_clauses]
    return list(await asyncio.gather(*tasks))
