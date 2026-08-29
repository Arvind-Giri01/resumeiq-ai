from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ScoreBreakdown(BaseModel):
    model_config = ConfigDict(extra="forbid")

    formatting: int = Field(ge=0, le=25, description="Formatting and readability score out of 25")
    keywords: int = Field(ge=0, le=25, description="Keyword relevance score out of 25")
    experience: int = Field(ge=0, le=25, description="Experience impact score out of 25")
    skills: int = Field(ge=0, le=25, description="Skills evidence score out of 25")

    @property
    def total(self) -> int:
        return self.formatting + self.keywords + self.experience + self.skills


class AnalysisResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ats_score: int = Field(ge=0, le=100)
    score_breakdown: ScoreBreakdown
    missing_keywords: list[str] = Field(min_length=0, max_length=12)
    strengths: list[str] = Field(min_length=2, max_length=6)
    improvements: list[str] = Field(min_length=3, max_length=7)
    jd_match_percentage: int | None = Field(default=None, ge=0, le=100)
    jd_gap_analysis: list[str] = Field(default_factory=list, max_length=6)
    interview_questions: list[str] = Field(min_length=4, max_length=8)

    @model_validator(mode="after")
    def score_matches_breakdown(self) -> "AnalysisResult":
        if self.ats_score != self.score_breakdown.total:
            raise ValueError("ats_score must equal the score_breakdown total")
        return self


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    resume_text: str = Field(min_length=120, max_length=60_000)
    job_description: str | None = Field(default=None, max_length=30_000)


class UploadResponse(BaseModel):
    text: str
    character_count: int
    page_count: int


class HealthResponse(BaseModel):
    status: str
    ai_configured: bool
