import asyncio
import hashlib
from typing import Optional
import structlog
import httpx

from config import (
    OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT,
    TEMPLATE_EXPLANATIONS, USE_OLLAMA
)

log = structlog.get_logger()

_explanation_cache: dict[str, str] = {}

SIMPLIFIER_SYSTEM_PROMPT = (
    "You are a legal literacy assistant helping small business owners in India understand "
    "loan agreement clauses. Explain clearly in 2-3 simple sentences what the following "
    "clause means for the borrower, and why it may be harmful. Use simple English. "
    "Do not use legal jargon. Be direct and specific about the risk."
)


def _hash_clause(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()


def _template_explanation(primary_category: Optional[str]) -> str:
    if primary_category and primary_category in TEMPLATE_EXPLANATIONS:
        return TEMPLATE_EXPLANATIONS[primary_category]
    return (
        "This clause may contain terms that are unfavourable to you as the borrower. "
        "It is advisable to consult a legal professional before signing this agreement. "
        "The specific risks depend on the exact language used."
    )


async def _explain_via_ollama(text: str) -> Optional[str]:
    """Call Ollama API asynchronously with timeout."""
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": f"{SIMPLIFIER_SYSTEM_PROMPT}\n\nClause:\n{text[:800]}",
        "stream": False,
        "options": {"temperature": 0.3, "num_predict": 150},
    }
    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json=payload,
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("response", "").strip()
    except (httpx.TimeoutException, httpx.ConnectError):
        log.info("Ollama not available or timed out, using template")
    except Exception as e:
        log.warning("Ollama call failed", error=str(e))
    return None


async def simplify_clause(
    text: str,
    primary_category: Optional[str] = None,
) -> str:
    """
    Generate a plain-language explanation for a clause.
    Priority: cache → Ollama → template.
    """
    cache_key = _hash_clause(text)
    if cache_key in _explanation_cache:
        return _explanation_cache[cache_key]

    explanation = None

    if USE_OLLAMA:
        explanation = await _explain_via_ollama(text)

    if not explanation:
        explanation = _template_explanation(primary_category)

    _explanation_cache[cache_key] = explanation
    return explanation


async def simplify_clauses_batch(
    flagged_clauses: list[dict],
) -> list[dict]:
    """Run simplification for all flagged clauses concurrently."""
    async def process_one(clause_data: dict) -> dict:
        classification = clause_data.get("classification", {})
        if not classification.get("is_predatory"):
            return clause_data
        text = clause_data.get("clause", {}).get("text", "")
        categories = classification.get("categories", [])
        primary_cat = categories[0]["name"] if categories else None
        clause_data["plain_explanation"] = await simplify_clause(text, primary_cat)
        return clause_data

    tasks = [process_one(c) for c in flagged_clauses]
    return list(await asyncio.gather(*tasks))
