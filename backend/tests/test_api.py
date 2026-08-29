from __future__ import annotations

import io
from types import SimpleNamespace

from fastapi.testclient import TestClient
from google.genai import errors
from reportlab.pdfgen import canvas

import main
from models import AnalysisResult
from services import gemini_service
from services.gemini_service import _response_schema


client = TestClient(main.app)


def test_gemini_schema_omits_unsupported_additional_properties() -> None:
    schema = _response_schema()

    def assert_supported(value: object) -> None:
        if isinstance(value, dict):
            assert "additionalProperties" not in value
            for child in value.values():
                assert_supported(child)
        elif isinstance(value, list):
            for child in value:
                assert_supported(child)

    assert_supported(schema)


def test_gemini_falls_back_when_primary_model_is_unavailable(monkeypatch) -> None:
    calls: list[str] = []
    parsed_result = {
        "ats_score": 78,
        "score_breakdown": {"formatting": 20, "keywords": 18, "experience": 21, "skills": 19},
        "missing_keywords": ["AWS"],
        "strengths": ["Quantified impact", "Relevant API experience", "Clear ownership"],
        "improvements": ["Add scale", "Name cloud services", "Clarify scope", "Use consistent dates"],
        "jd_match_percentage": 72,
        "jd_gap_analysis": ["No AWS evidence"],
        "interview_questions": ["Question one?", "Question two?", "Question three?", "Question four?"],
    }

    class FakeModels:
        def generate_content(self, **kwargs):
            calls.append(kwargs["model"])
            if len(calls) == 1:
                raise errors.ServerError(503, {"error": {"message": "high demand"}})
            return SimpleNamespace(parsed=parsed_result, text="")

    class FakeClient:
        models = FakeModels()

    settings = SimpleNamespace(
        gemini_api_key="test-key",
        gemini_model="gemini-3.7-flash",
        gemini_fallback_model="gemini-3.6-flash",
        gemini_timeout_ms=45_000,
    )
    monkeypatch.setattr(gemini_service, "get_settings", lambda: settings)
    monkeypatch.setattr(gemini_service.genai, "Client", lambda **kwargs: FakeClient())

    result = gemini_service._generate("Experienced Python engineer. " * 12, "Build reliable APIs.")

    assert calls == ["gemini-3.7-flash", "gemini-3.6-flash"]
    assert result.ats_score == 78


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
