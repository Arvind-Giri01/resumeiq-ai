# ResumeIQ

![ResumeIQ — Make every word earn its place.](./frontend/public/og.png)

ResumeIQ is a full-stack AI resume analyzer that turns a PDF into a practical ATS score, job-match analysis, missing keywords, editing priorities, and resume-specific interview questions.

## Live deployment

- Web app: [resumeiq-ai-arvind.arvind92029.chatgpt.site](https://resumeiq-ai-arvind.arvind92029.chatgpt.site)
- API health: [resumeiq-api-tury.onrender.com/health](https://resumeiq-api-tury.onrender.com/health)
- Source: [github.com/Arvind-Giri01/resumeiq-ai](https://github.com/Arvind-Giri01/resumeiq-ai)

The web app is currently access-controlled for its owner. The Render API uses a free instance, so the first request after inactivity can take 50 seconds or more while the service wakes up.

## What it does

- Accepts drag-and-drop PDF uploads up to 5 MB
- Rejects non-PDF, oversized, damaged, encrypted, image-only, and unusually long documents with readable errors
- Extracts text without storing the uploaded resume
- Produces a validated 0–100 ATS score with four transparent 25-point categories
- Compares the resume with an optional job description
- Finds missing keywords without recommending keyword stuffing
- Generates evidence-based strengths, editing actions, role gaps, and interview questions
- Handles AI timeouts, quota limits, malformed output, and service failures without exposing stack traces
- Falls back to a second stable Gemini model when the primary model reports temporary unavailability
- Rate-limits public analysis requests and restricts CORS to configured origins
- Works responsively from 375 px upward and supports reduced-motion preferences

## Architecture

```text
PDF → FastAPI validation + pypdf extraction → Gemini structured output → Pydantic validation → React results UI
```

The backend uses Gemini's JSON schema mode and validates the response a second time with Pydantic. `ats_score` must equal the sum of the four category scores, and any malformed or inconsistent response is rejected before it reaches the browser. If the primary Gemini model returns a transient `503`, the backend retries once through a configured stable fallback model.

## Stack

- Frontend: React 19, Vinext/Vite, Tailwind CSS 4, TypeScript
- Backend: Python 3.12, FastAPI, pypdf, Pydantic, SlowAPI
- AI: Google GenAI SDK with Gemini structured output
- Hosting: OpenAI Sites-compatible frontend and Render Blueprint-ready backend
- Testing: Pytest, FastAPI TestClient, ReportLab test fixtures

## Run locally

### 1. Configure the backend

```bash
cd backend
python -m venv .venv
```

Activate the environment:

```bash
# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# macOS or Linux
source .venv/bin/activate
```

Install dependencies and create the local environment file:

```bash
pip install -r requirements-dev.txt
cp .env.example .env
```

On PowerShell, use `Copy-Item .env.example .env` instead of `cp`. Add your key from [Google AI Studio](https://aistudio.google.com/app/apikey) to `backend/.env`, then start the API:

```bash
uvicorn main:app --reload
```

The health endpoint is at `http://localhost:8000/health` and interactive API docs are at `http://localhost:8000/docs`.

### 2. Configure the frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The example frontend environment already points to the local API. Browser requests go through same-origin server routes, so the backend URL is never baked into the client bundle.

## Tests and production build

```bash
cd backend
python -m pytest -q

cd ../frontend
npm run build
```

## API contract

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/health` | `GET` | Service readiness and AI configuration state |
| `/upload` | `POST` | Validate a PDF and return extracted text metadata |
| `/analyze` | `POST` | Return a schema-validated resume analysis |

The analysis response includes `ats_score`, `score_breakdown`, `missing_keywords`, `strengths`, `improvements`, optional `jd_match_percentage`, `jd_gap_analysis`, and `interview_questions`.

## Deployment

### Backend on Render

Push the repository to GitHub, then create a Blueprint from the root `render.yaml`. Render will ask for two secret values:

- `GEMINI_API_KEY`: your Google AI Studio key
- `CORS_ORIGINS`: the deployed frontend URL, without a trailing slash

The Blueprint sets the correct root directory, Python version, start command, health check, primary and fallback models, and rate limit. The production health endpoint at [resumeiq-api-tury.onrender.com/health](https://resumeiq-api-tury.onrender.com/health) returns `{"status":"ok","ai_configured":true}`.

### Frontend

The hosted frontend uses these production values:

```env
RESUMEIQ_API_URL=https://resumeiq-api-tury.onrender.com
SITE_URL=https://resumeiq-ai-arvind.arvind92029.chatgpt.site
```

The frontend is deployed through OpenAI Sites. If the domain changes, update `CORS_ORIGINS` on Render and redeploy the backend.

## Security and privacy notes

- `.env` and `.env.local` are ignored; only example files are committed.
- Resume contents are not written to disk or a database.
- Upload and analysis responses include `Cache-Control: no-store`.
- The API key stays on the backend and is never included in frontend code.
- The model prompt treats both the resume and job description as untrusted data.
- ResumeIQ provides editorial guidance, not hiring guarantees. Users should verify every suggested change.

## Known v1 limitations

- PDF only; DOCX is not supported
- Image-only/scanned PDFs need OCR and are rejected
- Extracted text cannot reveal exact typography, margins, or visual hierarchy
- No accounts, history, persistence, payments, or in-app rewriting
- AI assessments are probabilistic and can vary slightly between runs

## Portfolio-ready summary

A concise resume entry could read:

> **ResumeIQ** — Python, FastAPI, React, Gemini API  
> Built a full-stack resume analyzer that extracts text from PDFs and returns schema-validated ATS scoring, job-match gaps, and tailored interview questions. Added strict upload validation, Pydantic-enforced LLM output, rate limiting, CORS controls, and graceful handling for malformed responses, timeouts, and API quota failures.
