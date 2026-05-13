"""
Rule-based validation against RBI fair-practice norms (data/rbi_rules.json).

Rules schema (per entry):
{
  "id":          "RBI-INT-001",
  "name":        "Unilateral interest rate change",
  "keywords":    ["sole discretion", "unilaterally"],
  "severity":    "HIGH" | "MEDIUM" | "LOW",
  "applies_to":  ["Interest Clause"]   # empty list = applies to any label
  "description": "..."
}
"""
import json
import os
from typing import Dict, List, Optional

RULES_PATH = os.path.join("data", "rbi_rules.json")

_rules_cache: Optional[Dict] = None


def _load_rules() -> Dict:
    global _rules_cache
    if _rules_cache is not None:
        return _rules_cache
    try:
        with open(RULES_PATH, "r", encoding="utf-8") as f:
            _rules_cache = json.load(f)
    except Exception as exc:  # pragma: no cover
        print(f"[validator] Could not load RBI rules: {exc}")
        _rules_cache = {"rules": []}
    return _rules_cache


def validate_clause(clause: str, label: str) -> str:
    """
    Score the clause against the RBI rules and return one of LOW / MEDIUM / HIGH.
    """
    rules = _load_rules().get("rules", [])
    text = (clause or "").lower()

    severity_score = _baseline_for_label(label)

    for rule in rules:
        keywords: List[str] = rule.get("keywords", [])
        severity: str = str(rule.get("severity", "LOW")).upper()
        applies_to: List[str] = rule.get("applies_to", [])

        if applies_to and label not in applies_to:
            continue

        if any(kw.lower() in text for kw in keywords):
            severity_score += _severity_weight(severity)

    if severity_score >= 5:
        return "HIGH"
    if severity_score >= 2:
        return "MEDIUM"
    return "LOW"


def _severity_weight(sev: str) -> int:
    return {"HIGH": 4, "MEDIUM": 2, "LOW": 1}.get(sev, 0)


def _baseline_for_label(label: str) -> int:
    """Categories already known to be risky start with a small baseline score."""
    return {
        "Penalty Clause": 2,
        "Interest Clause": 2,
        "Liability Clause": 2,
        "Termination Clause": 1,
        "Arbitration Clause": 1,
        "Other": 0,
    }.get(label, 0)
