from __future__ import annotations

import io

from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas

import main
from models import AnalysisResult


client = TestClient(main.app)


def make_pdf(text: str) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer)
    y = 800
    for line in text.splitlines():
        pdf.drawString(72, y, line)
        y -= 18
    pdf.showPage()
    pdf.save()
    return buffer.getvalue()


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_upload_extracts_pdf_text() -> None:
    resume = "Alex Morgan\nSoftware Engineer\n" + "Built reliable Python APIs and improved latency by 35%. " * 4
    response = client.post("/upload", files={"file": ("resume.pdf", make_pdf(resume), "application/pdf")})
    assert response.status_code == 200
    assert "Software Engineer" in response.json()["text"]
    assert response.json()["page_count"] == 1


def test_upload_rejects_non_pdf() -> None:
    response = client.post("/upload", files={"file": ("resume.txt", b"not a pdf", "text/plain")})
    assert response.status_code == 415


def test_upload_rejects_large_pdf() -> None:
    response = client.post(
        "/upload",
        files={"file": ("resume.pdf", b"%PDF" + (b"0" * (5 * 1024 * 1024)), "application/pdf")},
    )
    assert response.status_code == 413


def test_upload_rejects_image_only_pdf() -> None:
    response = client.post("/upload", files={"file": ("blank.pdf", make_pdf(""), "application/pdf")})
    assert response.status_code == 422
    assert "No readable text" in response.json()["detail"]


def test_analyze_returns_structured_result(monkeypatch) -> None:
    expected = AnalysisResult.model_validate(
        {
            "ats_score": 78,
            "score_breakdown": {"formatting": 20, "keywords": 18, "experience": 21, "skills": 19},
            "missing_keywords": ["CI/CD", "observability"],
            "strengths": ["Quantified API impact", "Relevant Python experience", "Clear project ownership"],
            "improvements": ["Add project scale", "Name test coverage", "Clarify role scope", "Use consistent dates"],
            "jd_match_percentage": 72,
            "jd_gap_analysis": ["No cloud deployment evidence"],
            "interview_questions": [
                "How did you reduce latency?",
                "What tradeoffs did you make?",
                "How did you test the API?",
                "What would you improve next?",
                "How was impact measured?",
            ],
        }
    )

    async def fake_analyze(resume_text: str, job_description: str | None) -> AnalysisResult:
        return expected

    monkeypatch.setattr(main, "analyze_resume", fake_analyze)
    response = client.post(
        "/analyze",
        json={"resume_text": "Experienced Python engineer. " * 12, "job_description": "Build reliable APIs."},
    )
    assert response.status_code == 200
    assert response.json()["ats_score"] == 78
    assert response.json()["jd_match_percentage"] == 72
