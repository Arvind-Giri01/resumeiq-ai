from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.7-flash").strip()
    gemini_fallback_model: str = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.6-flash").strip()
    gemini_timeout_ms: int = int(os.getenv("GEMINI_TIMEOUT_MS", "45000"))
    cors_origins_raw: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
    rate_limit: str = os.getenv("ANALYZE_RATE_LIMIT", "5/minute")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_origins_raw.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
