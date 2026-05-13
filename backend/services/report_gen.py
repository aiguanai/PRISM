"""
Assembles the final JSON report from per-clause results.
"""
from typing import Dict, List


def generate_report(results: List[Dict], filename: str = "") -> Dict:
    """Aggregate per-clause results into the API response shape."""
    total = len(results)
    high = sum(1 for r in results if r.get("risk_level") == "HIGH")
    medium = sum(1 for r in results if r.get("risk_level") == "MEDIUM")
    safe = sum(1 for r in results if r.get("risk_level") == "LOW")

    return {
        "status": "success",
        "filename": filename,
        "results": results,
        "summary": {
            "total_clauses": total,
            "high_risk": high,
            "medium_risk": medium,
            "safe": safe,
        },
    }
