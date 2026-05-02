#!/usr/bin/env python3
"""
Quick end-to-end pipeline test — no frontend needed.
Run from the backend/ directory:  python test_sample.py
"""
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from config import DEMO_CLAUSE
from services.classifier import classify_clauses, _classify_single
from services.segmenter import segment_clauses
from services.validator import validate_clause
from services.explainer import explain_clause
from services.simplifier import simplify_clause


SAMPLE = DEMO_CLAUSE

SINGLE_CLAUSE = """
The Borrower irrevocably waives any right to approach any court of competent jurisdiction
or the Banking Ombudsman in respect of any dispute arising from this Agreement.
All disputes shall be referred to a sole arbitrator to be appointed by the Bank,
whose decision shall be final and binding upon the Borrower.
"""


def print_section(title: str):
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print('─' * 60)


async def main():
    print("\n" + "=" * 60)
    print("   PRISM — Pipeline Smoke Test")
    print("=" * 60)

    # ── Test 1: Segmentation ──
    print_section("1. Clause Segmentation")
    clauses = segment_clauses(SAMPLE, None)
    print(f"  Extracted {len(clauses)} clause(s)")
    for c in clauses[:3]:
        print(f"  [{c['clause_id']}] {c.get('heading', '(no heading)')[:60]}")
        print(f"         {c['text'][:80].strip()}…")

    # ── Test 2: Classification ──
    print_section("2. Predatory Clause Classification")
    result = _classify_single(SINGLE_CLAUSE)
    print(f"  Is predatory: {result['is_predatory']}")
    print(f"  Overall confidence: {result['overall_confidence']:.2%}")
    for cat in result["categories"]:
        bar = "█" * int(cat["confidence"] * 20)
        print(f"  [{cat['severity']:6s}] {cat['name']:<24s} {bar} {cat['confidence']:.2%}")

    # ── Test 3: Full clause batch classification ──
    print_section("3. Batch Classification")
    classified = classify_clauses(clauses, None)
    flagged = [c for c in classified if c.get("classification", {}).get("is_predatory")]
    print(f"  Total: {len(classified)}  Flagged: {len(flagged)}")

    # ── Test 4: Regulatory Validation ──
    print_section("4. RBI Regulatory Validation")
    cats = result.get("categories", [])
    reg_results = validate_clause(SINGLE_CLAUSE, cats)
    if reg_results:
        for rr in reg_results:
            verdict_sym = "⚠" if rr["verdict"] == "VIOLATION" else "⚑"
            print(f"  {verdict_sym} [{rr['rule_id']}] {rr['verdict']}")
            print(f"     {rr['rule_description'][:70]}")
    else:
        print("  No rules triggered.")

    # ── Test 5: Explainer ──
    print_section("5. Keyword Saliency")
    exp = explain_clause("test_clause", SINGLE_CLAUSE, cats)
    print(f"  Top {len(exp['highlighted_spans'])} highlight(s):")
    for span in exp["highlighted_spans"]:
        print(f"    [{span['importance_score']:.2f}] '{span['text']}'")

    # ── Test 6: Simplifier ──
    print_section("6. Plain-Language Explanation")
    primary_cat = cats[0]["name"] if cats else None
    explanation = await simplify_clause(SINGLE_CLAUSE, primary_cat)
    print(f"  {explanation}")

    print("\n" + "=" * 60)
    print("  All tests passed.")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
