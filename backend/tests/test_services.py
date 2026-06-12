"""Unit tests for the pure-function pipeline stages."""
from services.pii_scrubber import scrub_pii
from services.segmenter import segment_clauses
from services.validator import validate_clause
from services.classifier import _classify_heuristic


SAMPLE_AGREEMENT = """
1. LOAN AMOUNT
The lender agrees to provide a term loan of Rs. 10,00,000 to the borrower
for business expansion purposes as agreed in the sanction letter.

2. PENALTY CLAUSE
The borrower shall pay a prepayment penalty of 5% along with compound penal
interest at 36% per annum on any overdue amount without exception.

3. REPAYMENT
The loan shall be repaid in 60 equal monthly instalments as set out in the
repayment schedule provided before disbursement of the loan amount.
"""


# ── PII scrubber ──────────────────────────────────────────────────────────────

def test_scrub_aadhaar():
    assert "1234 5678 9012" not in scrub_pii("Aadhaar: 1234 5678 9012")

def test_scrub_pan():
    assert "ABCDE1234F" not in scrub_pii("PAN ABCDE1234F belongs to borrower")

def test_scrub_email():
    assert "x@example.com" not in scrub_pii("Contact x@example.com for queries")

def test_scrub_phone():
    assert "9876543210" not in scrub_pii("Call 9876543210 anytime")

def test_scrub_preserves_normal_text():
    text = "The loan shall be repaid in 60 monthly instalments."
    assert scrub_pii(text) == text


# ── Segmenter ─────────────────────────────────────────────────────────────────

def test_segment_numbered_clauses():
    clauses = segment_clauses(SAMPLE_AGREEMENT)
    assert len(clauses) >= 3

def test_segment_empty_text():
    assert segment_clauses("") == []

def test_segment_returns_strings():
    assert all(isinstance(c, str) and c.strip() for c in segment_clauses(SAMPLE_AGREEMENT))


# ── Heuristic classifier ──────────────────────────────────────────────────────

def test_heuristic_flags_penalty():
    res = _classify_heuristic(
        "The borrower shall pay a prepayment penalty of 5% with compound penal interest."
    )
    assert res["label"] == "UNLAWFUL_PENALTY"

def test_heuristic_safe_clause():
    res = _classify_heuristic("The agreement is governed by mutual consent of both parties.")
    assert res["label"] == "SAFE"


# ── Validator ─────────────────────────────────────────────────────────────────

def test_validator_returns_shape():
    res = validate_clause(
        "The borrower shall pay a prepayment penalty of 5% with compound penal interest at 36% per annum.",
        "UNLAWFUL_PENALTY",
    )
    assert "risk_level" in res
    assert "matched_rules" in res
    assert res["risk_level"] in ("CRITICAL", "HIGH", "MEDIUM", "LOW")

def test_validator_safe_clause_low():
    res = validate_clause("The loan shall be repaid in 60 equal monthly instalments.", "SAFE")
    assert res["risk_level"] == "LOW"
