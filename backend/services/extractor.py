"""
Text extraction for .txt, .pdf, and .docx files.
"""
import os
from typing import Optional


def extract_text(file_path: str, ext: Optional[str] = None) -> str:
    """Return the raw text content of a TXT / PDF / DOCX file."""
    if ext is None:
        ext = os.path.splitext(file_path)[1]
    ext = ext.lower()

    if ext == ".txt":
        return _extract_txt(file_path)
    if ext == ".pdf":
        return _extract_pdf(file_path)
    if ext == ".docx":
        return _extract_docx(file_path)
    raise ValueError(f"Unsupported file extension: {ext}")


def _extract_txt(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def _extract_pdf(path: str) -> str:
    try:
        import pdfplumber
    except ImportError as e:  # pragma: no cover
        raise RuntimeError(
            "pdfplumber is required for PDF extraction. Install with: pip install pdfplumber"
        ) from e

    parts = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            try:
                page_text = page.extract_text() or ""
            except Exception:
                page_text = ""
            if page_text:
                parts.append(page_text)
    return "\n".join(parts)


def _extract_docx(path: str) -> str:
    try:
        from docx import Document
    except ImportError as e:  # pragma: no cover
        raise RuntimeError(
            "python-docx is required for DOCX extraction. Install with: pip install python-docx"
        ) from e

    doc = Document(path)
    parts = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
    # Pull text from tables too — legal docs often hide clauses there.
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                if cell.text and cell.text.strip():
                    parts.append(cell.text)
    return "\n".join(parts)
