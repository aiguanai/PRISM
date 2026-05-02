import re
import io
import logging
from pathlib import Path
from typing import Optional

import structlog

log = structlog.get_logger()


class ExtractionError(Exception):
    pass


def _clean_text(text: str) -> str:
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\r', '\n', text)
    lines = text.split('\n')
    cleaned = []
    for line in lines:
        stripped = line.strip()
        # Skip standalone page numbers
        if re.match(r'^\d{1,4}$', stripped):
            continue
        # Skip very short lines that are likely headers/footers repeated
        cleaned.append(line)
    text = '\n'.join(cleaned)
    text = re.sub(r'\n{4,}', '\n\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    return text.strip()


def _deduplicate_headers(pages: list[str]) -> list[str]:
    """Remove lines that appear identically on 3+ pages (headers/footers)."""
    if len(pages) < 3:
        return pages
    from collections import Counter
    line_counts: Counter = Counter()
    for page in pages:
        for line in set(page.split('\n')):
            s = line.strip()
            if len(s) > 5:
                line_counts[s] += 1
    repeated = {line for line, count in line_counts.items() if count >= 3}
    cleaned_pages = []
    for page in pages:
        lines = [ln for ln in page.split('\n') if ln.strip() not in repeated]
        cleaned_pages.append('\n'.join(lines))
    return cleaned_pages


def _extract_pdf_pdfplumber(file_path: Path) -> tuple[list[str], float]:
    import pdfplumber
    pages_text = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
                pages_text.append(text)
    except Exception as e:
        raise ExtractionError(f"pdfplumber failed: {e}") from e
    total_chars = sum(len(p) for p in pages_text)
    confidence = min(1.0, total_chars / (len(pages_text) * 200)) if pages_text else 0.0
    return pages_text, confidence


def _extract_pdf_pymupdf(file_path: Path) -> tuple[list[str], float]:
    import fitz
    pages_text = []
    try:
        doc = fitz.open(str(file_path))
        for page in doc:
            text = page.get_text("text") or ""
            pages_text.append(text)
        doc.close()
    except Exception as e:
        raise ExtractionError(f"PyMuPDF failed: {e}") from e
    total_chars = sum(len(p) for p in pages_text)
    confidence = min(1.0, total_chars / (len(pages_text) * 200)) if pages_text else 0.0
    return pages_text, confidence


def _preprocess_for_ocr(image):
    """Convert to grayscale, threshold, and basic deskew."""
    import cv2
    import numpy as np
    img_array = np.array(image)
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    else:
        gray = img_array
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    # Simple deskew via moments
    coords = np.column_stack(np.where(binary < 128))
    if len(coords) > 100:
        angle = cv2.minAreaRect(coords)[-1]
        if abs(angle) < 45:
            (h, w) = binary.shape
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle if angle < -45 else -angle, 1.0)
            binary = cv2.warpAffine(binary, M, (w, h), flags=cv2.INTER_CUBIC,
                                    borderMode=cv2.BORDER_REPLICATE)
    return binary


def _ocr_image(pil_image) -> str:
    import pytesseract
    from PIL import Image as PILImage
    processed = _preprocess_for_ocr(pil_image)
    from PIL import Image as PILImage
    pil_processed = PILImage.fromarray(processed)
    config = "--oem 3 --psm 6"
    return pytesseract.image_to_string(pil_processed, config=config, lang="eng")


def extract_from_image(file_path: Path):
    """Extract text from JPG/PNG via OCR."""
    from PIL import Image as PILImage
    try:
        img = PILImage.open(file_path)
        text = _ocr_image(img)
        text = _clean_text(text)
        confidence = min(1.0, len(text) / 500) if text.strip() else 0.1
        return {
            "raw_text": text,
            "page_count": 1,
            "extraction_method": "ocr_tesseract",
            "confidence_score": round(confidence, 2),
        }
    except Exception as e:
        raise ExtractionError(f"Image OCR failed: {e}") from e


def extract_from_docx(file_path: Path):
    """Extract text from DOCX using python-docx."""
    from docx import Document
    try:
        doc = Document(str(file_path))
        paragraphs = []
        for para in doc.paragraphs:
            if para.text.strip():
                paragraphs.append(para.text)
        # Also extract tables
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    paragraphs.append(row_text)
        raw_text = _clean_text('\n\n'.join(paragraphs))
        confidence = min(1.0, len(raw_text) / 500) if raw_text.strip() else 0.1
        return {
            "raw_text": raw_text,
            "page_count": 1,
            "extraction_method": "python_docx",
            "confidence_score": round(confidence, 2),
        }
    except Exception as e:
        raise ExtractionError(f"DOCX extraction failed: {e}") from e


def extract_from_pdf(file_path: Path):
    """Extract text from PDF with pdfplumber fallback to PyMuPDF, then OCR."""
    method = "pdfplumber"
    try:
        pages_text, confidence = _extract_pdf_pdfplumber(file_path)
        total_text = sum(len(p.strip()) for p in pages_text)
        if total_text < 200:
            log.info("pdfplumber returned sparse text, trying PyMuPDF", path=str(file_path))
            pages_text, confidence = _extract_pdf_pymupdf(file_path)
            method = "pymupdf"
            total_text = sum(len(p.strip()) for p in pages_text)
    except ExtractionError:
        log.info("pdfplumber failed, falling back to PyMuPDF", path=str(file_path))
        try:
            pages_text, confidence = _extract_pdf_pymupdf(file_path)
            method = "pymupdf"
            total_text = sum(len(p.strip()) for p in pages_text)
        except ExtractionError:
            pages_text, total_text = [], 0

    # If still sparse, attempt OCR
    if total_text < 200:
        log.info("PDF appears scanned, attempting OCR", path=str(file_path))
        try:
            import fitz
            from PIL import Image as PILImage
            doc = fitz.open(str(file_path))
            ocr_pages = []
            for page in doc:
                pix = page.get_pixmap(dpi=200)
                img = PILImage.frombytes("RGB", [pix.width, pix.height], pix.samples)
                ocr_pages.append(_ocr_image(img))
            doc.close()
            pages_text = ocr_pages
            method = "ocr_pymupdf"
            confidence = 0.7
        except Exception as e:
            log.warning("OCR fallback also failed", error=str(e))
            confidence = 0.1

    pages_text = _deduplicate_headers(pages_text)
    raw_text = _clean_text('\n\n'.join(pages_text))
    return {
        "raw_text": raw_text,
        "page_count": len(pages_text),
        "extraction_method": method,
        "confidence_score": round(confidence, 2),
    }


def extract_text(file_path: Path) -> dict:
    """Route file to appropriate extractor based on extension."""
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        return extract_from_pdf(file_path)
    elif suffix == ".docx":
        return extract_from_docx(file_path)
    elif suffix in {".jpg", ".jpeg", ".png"}:
        return extract_from_image(file_path)
    else:
        raise ExtractionError(f"Unsupported file type: {suffix}")
