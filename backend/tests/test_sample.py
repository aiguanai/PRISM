"""
Smoke test for the Legal Document Risk Analysis API.

Usage:
    1.  Start the server in one terminal:
            uvicorn main:app --reload

    2.  In another terminal, run:
            python tests/test_sample.py

It uploads a synthetic loan-agreement text file to POST /analyze and prints
the JSON response.
"""
import json
import os
import sys
import tempfile

try:
    import requests
except ImportError:
    print("ERROR: 'requests' is not installed. Run:  pip install requests")
    sys.exit(1)

API_URL = os.getenv("API_URL", "http://localhost:8000/analyze")

SAMPLE_TEXT = """\
LOAN AGREEMENT

1. Interest Rate. The borrower shall pay interest at the rate of 18% per annum,
compounded monthly, on the outstanding principal amount. The lender may, at its
sole discretion, revise the interest rate from time to time without prior notice.

2. Penalty for Late Payment. In the event of any default in payment, the borrower
shall be liable to pay a penal interest of 24% per annum in addition to the
contracted rate, along with applicable late fees and overdue charges.

3. Termination. The lender may, without notice, terminate this agreement forthwith
upon any breach by the borrower, and recall the entire loan amount along with all
accrued interest and charges.

4. Arbitration. Any dispute arising out of or in connection with this agreement
shall be referred to a sole arbitrator appointed by the lender, whose decision
shall be final and binding on the parties.

5. Indemnification. The borrower shall indemnify and hold harmless the lender
against any and all losses, damages, claims, costs, or liabilities, including
legal fees, regardless of cause.

6. Governing Law. This agreement shall be governed by the laws of India, with
exclusive jurisdiction of the courts of Mumbai.

Borrower contact details: borrower@example.com, +91-9876543210,
PAN ABCDE1234F, Aadhaar 1234 5678 9012, Account 123456789012.
"""


def main() -> int:
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".txt", delete=False, encoding="utf-8"
    ) as tmp:
        tmp.write(SAMPLE_TEXT)
        sample_path = tmp.name

    try:
        print(f"POST {API_URL}")
        with open(sample_path, "rb") as f:
            files = {"file": ("sample_agreement.txt", f, "text/plain")}
            response = requests.post(API_URL, files=files, timeout=60)

        print(f"HTTP {response.status_code}")
        try:
            data = response.json()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        except ValueError:
            print(response.text)
        return 0 if response.ok else 1

    except requests.ConnectionError:
        print(f"Could not connect to {API_URL}. Is the server running?")
        return 2
    finally:
        try:
            os.remove(sample_path)
        except OSError:
            pass


if __name__ == "__main__":
    sys.exit(main())
