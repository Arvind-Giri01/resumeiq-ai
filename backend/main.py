from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from config import get_settings
from models import AnalysisResult, AnalyzeRequest, HealthResponse, UploadResponse
from services.gemini_service import (
    GeminiConfigurationError,
    GeminiRateLimitError,
    GeminiResponseError,
    GeminiServiceError,
    GeminiTimeoutError,
    analyze_resume,
)
from services.pdf_service import MAX_FILE_BYTES, PdfValidationError, extract_pdf_text


settings = get_settings()
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="ResumeIQ API",
    description="Secure PDF extraction and structured AI resume analysis.",
    version="1.0.0",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def privacy_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path in {"/upload", "/analyze"}:
        response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", ai_configured=bool(settings.gemini_api_key))


@app.post("/upload", response_model=UploadResponse)
@limiter.limit("15/minute")
async def upload_resume(request: Request, file: UploadFile = File(...)) -> UploadResponse:
    content_type = (file.content_type or "").lower()
    if content_type != "application/pdf" or not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Please upload a PDF file.")

    content = await file.read(MAX_FILE_BYTES + 1)
    await file.close()
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="The PDF must be 5 MB or smaller.")

    try:
        text, page_count = extract_pdf_text(content)
    except PdfValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    return UploadResponse(text=text, character_count=len(text), page_count=page_count)


@app.post("/analyze", response_model=AnalysisResult)
@limiter.limit(settings.rate_limit)
async def analyze(request: Request, payload: AnalyzeRequest) -> AnalysisResult:
    try:
        return await analyze_resume(payload.resume_text, payload.job_description or None)
    except GeminiConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except GeminiRateLimitError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc
    except GeminiTimeoutError as exc:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=str(exc)) from exc
    except GeminiResponseError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except GeminiServiceError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
