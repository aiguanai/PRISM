"""
RBI rule validation — two modes:

  GPT mode   (OPENAI_API_KEY is set):
    Sends the clause + relevant RBI rules to gpt-4o-mini for semantic analysis.
    Understands negations, context, and intent — no false positives from
    phrases like "no compounding of penal interest".

  Keyword mode (fallback, no API key):
    Substring matching against rule keywords.  Fast but brittle.

Set OPENAI_API_KEY in the environment to enable GPT mode.
"""
import json
import os
from typing import Dict, List, Optional

RULES_PATH    = os.path.join("data", "rbi_rules.json")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

_rules_cache: Optional[Dict] = None


# ── Rule loading ───────────────────────────────────────────────────────────────

def _load_rules() -> Dict:
    global _rules_cache
    if _rules_cache is not None:
        return _rules_cache
    try:
        with open(RULES_PATH, "r", encoding="utf-8") as f:
            _rules_cache = json.load(f)
    except Exception as exc:
        print(f"[validator] Could not load RBI rules: {exc}")
        _rules_cache = {"rules": []}
    return _rules_cache


# ── Public API ─────────────────────────────────────────────────────────────────

def validate_clause(clause: str, label: str) -> Dict:
    """
    Validate a clause against 163 RBI rules using keyword matching.

    The new rule set has specific multi-word pattern_keywords that are precise
    enough to avoid false positives without needing GPT. GPT is reserved for
    the simplifier (plain-language explanation), not rule matching.
    """
    rules = _load_rules().get("rules", [])
    return _validate_with_keywords(clause, label, rules)


# ── GPT validation ─────────────────────────────────────────────────────────────

def _validate_with_gpt(clause: str, label: str, rules: list) -> Dict:
    """Semantic RBI rule validation using gpt-4o-mini."""
    from openai import OpenAI

    client = OpenAI(api_key=OPENAI_API_KEY)

    # Map PRISM label → likely rule categories to limit token usage.
    # 163 rules is too many to send verbatim; pick the ~30 most relevant.
    _label_cats = {
        "UNLAWFUL_PENALTY":       {"prepayment_charges", "penal_charges_no_capitalization",
                                   "recall_without_notice", "cooling_off"},
        "HIDDEN_FEE":             {"hidden_charges", "fee_disclosure", "lsp_fee_charging",
                                   "kfs_missing", "apr_disclosure"},
        "UNILATERAL_RATE_CHANGE": {"unilateral_rate_change", "interest_rate_policy",
                                   "blended_rate_disclosure", "auto_limit_increase"},
        "COLLATERAL_OVERREACH":   {"repossession_without_notice", "auto_debit_mandate"},
        "ARBITRATION_WAIVER":     {"grievance_redressal", "recovery_harassment",
                                   "contact_third_parties", "recovery_practices"},
        "BALLOON_PAYMENT":        {"repayment_schedule", "disbursement_channel",
                                   "repayment_channel"},
    }
    target_cats = _label_cats.get(label, set())

    # Always include applies_to-matched rules, category-matched rules, and MSME rules
    relevant = [
        r for r in rules
        if (not r.get("applies_to") and not r.get("category"))  # universal
        or (label in r.get("applies_to", []))                   # direct applies_to match
        or (r.get("category", "") in target_cats)               # category match
        or r.get("id", "").startswith("RBI-MSME-")              # all MSME rules
    ][:35]  # cap at 35 to stay within token budget

    if not relevant:
        return {"risk_level": "LOW", "matched_rules": []}

    rules_block = "\n".join(
        f"  {r['id']}: {r['name']} — {r['description']}"
        for r in relevant
    )

    system_prompt = (
        "You are an expert in Indian banking law specialising in RBI regulations "
        "for MSME lending. Your job is to determine whether a loan agreement clause "
        "actually violates specific RBI rules. Be precise about negations — "
        "\"no penalty shall apply\" is protective and does NOT violate a penalty rule."
    )

    user_prompt = f"""Clause category (from AI classifier): {label.replace('_', ' ').title()}

Loan Agreement Clause:
\"\"\"{clause[:700]}\"\"\"

Potentially Applicable RBI Rules:
{rules_block}

Determine which rules this clause ACTUALLY violates. Return JSON only:
{{
  "violated_rules": [
    {{
      "id": "<rule id>",
      "confidence": <0.0-1.0>,
      "reason": "<one sentence explaining the specific violation>"
    }}
  ],
  "overall_severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}}

If the clause contains protective language that prevents a violation, do not include that rule.
If no rules are violated, return violated_rules as an empty array and overall_severity as "LOW"."""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        temperature=0,
        response_format={"type": "json_object"},
        max_tokens=600,
    )

    result      = json.loads(response.choices[0].message.content)
    violated_ids = {v["id"] for v in result.get("violated_rules", [])}

    matched_rules: List[Dict] = []
    for rule in relevant:
        if rule["id"] not in violated_ids:
            continue
        gpt_entry = next(
            (v for v in result["violated_rules"] if v["id"] == rule["id"]), {}
        )
        matched_rules.append({
            "id":          rule["id"],
            "name":        rule.get("name") or rule.get("category", ""),
            "severity":    rule.get("severity", "MEDIUM"),
            "description": rule.get("description", ""),
            "plain_rule":  rule.get("plain_rule", ""),
            "verdict":     rule.get("verdict_if_triggered", "POSSIBLE_VIOLATION"),
            "reason":      gpt_entry.get("reason", ""),
            "confidence":  round(float(gpt_entry.get("confidence", 0.8)), 2),
        })

    return {
        "risk_level":    result.get("overall_severity", "LOW"),
        "matched_rules": matched_rules,
    }


# ── Keyword fallback ───────────────────────────────────────────────────────────

def _validate_with_keywords(clause: str, label: str, rules: list) -> Dict:
    """Substring keyword matching — fast but context-blind."""
    text  = (clause or "").lower()
    score = _baseline_for_label(label)
    matched_rules: List[Dict] = []

    for rule in rules:
        # Support both schemas:
        #   new file: pattern_keywords + category
        #   old file: keywords + applies_to
        keywords: List[str] = (
            rule.get("pattern_keywords") or rule.get("keywords") or []
        )
        severity: str = str(rule.get("severity", "LOW")).upper()

        # Only run rules that are relevant to the clause's PRISM label.
        # Rules whose category doesn't relate to any of the 7 labels (e.g.
        # data_sharing_without_consent, disbursement_channel) are skipped
        # unless the clause itself is explicitly about those topics.
        rule_category = rule.get("category", "")
        applies_to: List[str] = rule.get("applies_to", [])

        if applies_to and label not in applies_to:
            continue

        # For new-format rules, filter by category → PRISM label mapping
        if rule_category and not _category_relevant_for_label(
            rule_category, label, rule.get("id", "")
        ):
            continue

        if any(kw.lower() in text for kw in keywords):
            score += _severity_weight(severity)
            matched_rules.append({
                "id":          rule.get("id", ""),
                "name":        rule.get("name") or rule.get("category", ""),
                "severity":    severity,
                "description": rule.get("description", ""),
                "plain_rule":  rule.get("plain_rule", ""),
                "verdict":     rule.get("verdict_if_triggered", "POSSIBLE_VIOLATION"),
                "reason":      "",        # no GPT reason in keyword mode
                "confidence":  0.6,
            })

    if score >= 8:
        risk_level = "CRITICAL"
    elif score >= 5:
        risk_level = "HIGH"
    elif score >= 2:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {"risk_level": risk_level, "matched_rules": matched_rules}


# ── Helpers ────────────────────────────────────────────────────────────────────

_CATEGORY_TO_LABEL: Dict[str, List[str]] = {
    # Categories that map to UNLAWFUL_PENALTY
    "prepayment_charges":           ["UNLAWFUL_PENALTY"],
    "penal_charges_no_capitalization": ["UNLAWFUL_PENALTY"],
    "recall_without_notice":        ["UNLAWFUL_PENALTY"],
    "cooling_off":                  ["UNLAWFUL_PENALTY"],
    # HIDDEN_FEE
    "hidden_charges":               ["HIDDEN_FEE"],
    "fee_disclosure":               ["HIDDEN_FEE"],
    "lsp_fee_charging":             ["HIDDEN_FEE"],
    "kfs_missing":                  ["HIDDEN_FEE"],
    "apr_disclosure":               ["HIDDEN_FEE"],
    "co_lending_fees":              ["HIDDEN_FEE"],
    # UNILATERAL_RATE_CHANGE
    "unilateral_rate_change":       ["UNILATERAL_RATE_CHANGE"],
    "interest_rate_policy":         ["UNILATERAL_RATE_CHANGE"],
    "blended_rate_disclosure":      ["UNILATERAL_RATE_CHANGE"],
    "auto_limit_increase":          ["UNILATERAL_RATE_CHANGE"],
    # COLLATERAL_OVERREACH
    "repossession_without_notice":  ["COLLATERAL_OVERREACH"],
    "auto_debit_mandate":           ["COLLATERAL_OVERREACH"],
    # ARBITRATION_WAIVER
    "grievance_redressal":          ["ARBITRATION_WAIVER"],
    "recovery_harassment":          ["ARBITRATION_WAIVER"],
    "contact_third_parties":        ["ARBITRATION_WAIVER"],
    "recovery_practices":           ["ARBITRATION_WAIVER"],
    # BALLOON_PAYMENT
    "repayment_schedule":           ["BALLOON_PAYMENT"],
    # Multi-label or universal
    "loan_agreement_copy":          ["HIDDEN_FEE", "UNLAWFUL_PENALTY"],
    "co_lending_disclosure":        ["HIDDEN_FEE"],
    "co_lending_repayment":         ["BALLOON_PAYMENT"],
    "co_lending_agreement":         ["HIDDEN_FEE"],
    "co_lending_fund_flow":         ["HIDDEN_FEE"],
    "co_lender_change":             ["UNILATERAL_RATE_CHANGE"],
}


def _category_relevant_for_label(category: str, label: str, rule_id: str = "") -> bool:
    """Return True if this RBI rule category is relevant for the given PRISM label."""
    if not category:
        return True   # no category = universal rule, always check

    # RBI-MSME-* rules are MSME-specific violations — always run for non-SAFE clauses.
    # They cover 128 granular MSME loan violations and should all be checked.
    if rule_id.startswith("RBI-MSME-"):
        return label != "SAFE"

    # For DL/NBFC/CLM rules, use the explicit category→label mapping.
    allowed_labels = _CATEGORY_TO_LABEL.get(category)
    if allowed_labels is None:
        return False  # unknown category for DL/NBFC/CLM = skip
    return label in allowed_labels


def _severity_weight(sev: str) -> int:
    return {"CRITICAL": 6, "HIGH": 4, "MEDIUM": 2, "LOW": 1}.get(sev, 0)


def _baseline_for_label(label: str) -> int:
    return {
        "UNLAWFUL_PENALTY":       2,
        "HIDDEN_FEE":             2,
        "UNILATERAL_RATE_CHANGE": 2,
        "COLLATERAL_OVERREACH":   2,
        "ARBITRATION_WAIVER":     1,
        "BALLOON_PAYMENT":        1,
        "SAFE":                   0,
    }.get(label, 0)
