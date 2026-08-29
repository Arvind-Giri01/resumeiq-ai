from __future__ import annotations

import io
import re

from pypdf import PdfReader
from pypdf.errors import PdfReadError


MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_PAGES = 10
MIN_EXTRACTED_CHARACTERS = 120


class PdfValidationError(ValueError):
    pass


def extract_pdf_text(content: bytes) -> tuple[str, int]:
    if not content.startswith(b"%PDF"):
        raise PdfValidationError("The selected file is not a valid PDF.")

    try:
        reader = PdfReader(io.BytesIO(content))
    except (PdfReadError, ValueError, OSError) as exc:
        raise PdfValidationError("This PDF is damaged or could not be read.") from exc

    if reader.is_encrypted:
        try:
            unlocked = reader.decrypt("")
        except Exception as exc:  # pypdf exposes several encryption-specific errors
            raise PdfValidationError("Password-protected PDFs are not supported.") from exc
        if not unlocked:
            raise PdfValidationError("Password-protected PDFs are not supported.")

    page_count = len(reader.pages)
    if page_count == 0:
        raise PdfValidationError("The PDF has no pages.")
    if page_count > MAX_PAGES:
        raise PdfValidationError(f"Please upload a resume with {MAX_PAGES} pages or fewer.")

    page_text: list[str] = []
    try:
        for page in reader.pages:
            page_text.append(page.extract_text() or "")
    except Exception as exc:
        raise PdfValidationError("Text could not be extracted from this PDF.") from exc

    text = "\n".join(page_text).replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    if len(text) < MIN_EXTRACTED_CHARACTERS:
        raise PdfValidationError(
            "No readable text was found. Scanned or image-only PDFs are not supported yet."
        )

    return text, page_count
