"""
PII redaction. Replaces identifiers with [REDACTED].

NOTE: Person 2 may swap this module out for a more sophisticated scrubber.
The public function `scrub_pii(text) -> str` is the stable interface.
"""
import re

REDACTED = "[REDACTED]"

# 12-digit Aadhaar (with optional spaces between blocks of 4)
AADHAAR_RE = re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")

# PAN: 5 letters + 4 digits + 1 letter
PAN_RE = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")

# Email
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")

# Indian mobile (+91 optional) or generic 10-digit phone, allows -, ., spaces
PHONE_RE = re.compile(
    r"(?:\+?91[\s\-]?)?[6-9]\d{9}"
    r"|\b\d{3}[\-\.\s]?\d{3}[\-\.\s]?\d{4}\b"
)

# IFSC: 4 letters + 0 + 6 alphanumerics
IFSC_RE = re.compile(r"\b[A-Z]{4}0[A-Z0-9]{6}\b")

# Generic bank account numbers (9–18 digit run, not preceded by letters/digits)
ACCOUNT_RE = re.compile(r"(?<!\d)(?<!\w)\d{9,18}(?!\d)")


def scrub_pii(text: str) -> str:
    """Return `text` with all detected PII replaced by [REDACTED]."""
    if not text:
        return text

    # Order matters: email & Aadhaar before generic account/phone digits.
    cleaned = EMAIL_RE.sub(REDACTED, text)
    cleaned = AADHAAR_RE.sub(REDACTED, cleaned)
    cleaned = PAN_RE.sub(REDACTED, cleaned)
    cleaned = IFSC_RE.sub(REDACTED, cleaned)
    cleaned = PHONE_RE.sub(REDACTED, cleaned)
    cleaned = ACCOUNT_RE.sub(REDACTED, cleaned)
    return cleaned
