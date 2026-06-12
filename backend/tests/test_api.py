"""API tests against the FastAPI app (heuristic classifier, temp DB)."""
import io


SAMPLE_DOC = b"""1. LOAN AMOUNT
The lender agrees to provide a term loan of Rs. 10,00,000 to the borrower
for business expansion purposes as agreed in the sanction letter.

2. PENALTY CLAUSE
The borrower shall pay a prepayment penalty of 5% along with compound penal
interest at 36% per annum on any overdue amount without exception.

3. REPAYMENT
The loan shall be repaid in 60 equal monthly instalments as set out in the
repayment schedule provided before disbursement of the loan amount.
"""


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_root_lists_endpoints(client):
    body = client.get("/").json()
    assert "/analyze" in body["endpoints"]
    assert "/analyses" in body["endpoints"]


def test_analyze_txt_document(client):
    res = client.post(
        "/analyze",
        files={"file": ("agreement.txt", io.BytesIO(SAMPLE_DOC), "text/plain")},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "success"
    assert body["summary"]["total_clauses"] >= 3
    assert body["report_id"]
    assert any(r["label"] == "UNLAWFUL_PENALTY" for r in body["results"])


def test_analyze_rejects_unknown_extension(client):
    res = client.post(
        "/analyze",
        files={"file": ("malware.exe", io.BytesIO(b"MZ\x90\x00"), "application/octet-stream")},
    )
    assert res.status_code == 400


def test_analyze_rejects_wrong_magic_bytes(client):
    # Claims .pdf but contains plain text
    res = client.post(
        "/analyze",
        files={"file": ("fake.pdf", io.BytesIO(b"not a real pdf"), "application/pdf")},
    )
    assert res.status_code == 400


def test_analysis_persisted_in_history(client):
    upload = client.post(
        "/analyze",
        files={"file": ("history_check.txt", io.BytesIO(SAMPLE_DOC), "text/plain")},
    ).json()
    report_id = upload["report_id"]

    listing = client.get("/analyses").json()
    assert any(item["id"] == report_id for item in listing["items"])

    detail = client.get(f"/analyses/{report_id}").json()
    assert detail["filename"] == "history_check.txt"
    assert len(detail["results"]) == detail["summary"]["total_clauses"]


def test_delete_analysis(client):
    upload = client.post(
        "/analyze",
        files={"file": ("to_delete.txt", io.BytesIO(SAMPLE_DOC), "text/plain")},
    ).json()
    report_id = upload["report_id"]

    res = client.delete(f"/analyses/{report_id}")
    assert res.status_code == 200
    assert client.get(f"/analyses/{report_id}").status_code == 404


def test_report_download(client):
    upload = client.post(
        "/analyze",
        files={"file": ("report_check.txt", io.BytesIO(SAMPLE_DOC), "text/plain")},
    ).json()
    res = client.get(f"/report/{upload['report_id']}")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF")
