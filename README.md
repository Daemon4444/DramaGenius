# DaraGenius v4

AI-native interactive short drama studio. DaraGenius combines trend analysis, character generation, interactive branching, script writing, video production, and playable demos into one React + FastAPI workspace.

## Tech Stack

- Frontend: React 18, Vite 5, Tailwind CSS, Framer Motion, React Router
- Backend: FastAPI, SQLAlchemy, Redis/Celery hooks, Elasticsearch hooks
- AI text: Alibaba Cloud Bailian / DashScope OpenAI-compatible API
- Voice: DashScope CosyVoice v2
- Video: DashScope video async task API, including HappyHorse and WAN models
- Export: JSON, Fountain, DOCX, PDF

## Main Features

- Landing page with Prophet, Soul, and Arbiter product sections
- Demo login flow with JWT-compatible tokens
- Studio project list with create/delete support
- Project overview with pipeline, metrics, recent activity, and export menu
- Prophet topic analysis with hot keywords, platform stats, and Qwen-powered trend analysis
- Soul character engine with character generation, dialogue generation, TTS, voice preview, voice clone fallback, and memory-query placeholder
- Arbiter decision engine with scenario generation, decision design, and streaming branch simulation
- Script workspace with episode list, AI generation, AI continuation, and copy workflow
- Producer workspace with hotspots, scripts, audience vote/comment APIs, production progress SSE, video playback, and HappyHorse text-to-video task submission
- Demo playback pages for the general demo and `浮华陷阱`
- Workspace export to `json`, `fountain`, `docx`, and `pdf`

## Project Layout

```text
.
├── src/                    # React app
│   ├── pages/              # Login and demo pages
│   ├── studio/             # Studio workspace panels
│   ├── components/         # Landing page and shared UI
│   ├── services/api.js     # Frontend API client
│   └── contexts/           # Auth context
├── backend/
│   ├── app/
│   │   ├── routers/        # Auth / Prophet / Soul / Arbiter / Workspace / Producer
│   │   ├── services/       # LLM, video, voice, search, producer services
│   │   ├── models/         # SQLAlchemy models
│   │   └── main.py         # FastAPI entry
│   ├── mock_assets/        # Demo scripts and videos
│   └── requirements.txt
├── public/                 # Frontend public assets and demo videos
├── PROJECT_WIKI.md
├── WIKI.md
├── DEVELOPMENT_PROGRESS.md
└── ISSUES_TODO.md
```

## Environment

Frontend variables can be placed in `.env` or `.env.local`:

```bash
VITE_API_BASE=/api
VITE_USE_REAL_API=true
```

Backend variables are normally placed in `backend/.env` or provided by the process environment:

```bash
DEV_SKIP_DB=true
DASHSCOPE_API_KEY=sk-xxx
COSYVOICE_API_KEY=sk-xxx

BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL_MAX=qwen-plus
QWEN_MODEL_PLUS=qwen-plus
QWEN_MODEL_TURBO=qwen-turbo

VIDEO_MODEL_DEFAULT=happyhorse-1.0-t2v
VIDEO_API_BASE=https://dashscope.aliyuncs.com/api/v1
HAPPYHORSE_T2V_MODEL=happyhorse-1.0-t2v
HAPPYHORSE_I2V_MODEL=happyhorse-1.0-i2v
HAPPYHORSE_R2V_MODEL=happyhorse-1.0-r2v
HAPPYHORSE_EDIT_MODEL=happyhorse-1.0-video-edit
```

Do not commit real API keys.

## Local Development

Install frontend dependencies:

```bash
npm install
```

Create a Python environment and install backend dependencies:

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

If your system Python is older than 3.10, use Python 3.10+ because the backend uses modern type syntax.

Start the backend in lightweight demo mode:

```bash
cd backend
DEV_SKIP_DB=true \
DASHSCOPE_API_KEY=sk-xxx \
COSYVOICE_API_KEY=sk-xxx \
VIDEO_MODEL_DEFAULT=happyhorse-1.0-t2v \
QWEN_MODEL_MAX=qwen-plus \
QWEN_MODEL_PLUS=qwen-plus \
QWEN_MODEL_TURBO=qwen-turbo \
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Start the frontend:

```bash
npm run dev -- --host 127.0.0.1 --port 3000
```

Open:

```text
http://127.0.0.1:3000/
```

## Demo Mode

With `DEV_SKIP_DB=true`, the app can run without PostgreSQL, Redis, or Elasticsearch.

Demo mode provides:

- Any email/password login
- In-memory projects
- Built-in demo project data
- Mock videos and scripts
- Fallback hotspot/platform data when Elasticsearch is unavailable
- Browser TTS fallback for voice preview

Some database-dependent Producer routes intentionally return a clear demo limitation message.

## API Overview

Core route groups:

- `GET /health`
- `/api/auth/*`
- `/api/prophet/*`
- `/api/soul/*`
- `/api/arbiter/*`
- `/api/workspace/*`
- `/api/producer/*`

Important workflow endpoints:

- `POST /api/workspace/generate-plan` streams Prophet -> Soul -> Arbiter -> Outline
- `POST /api/workspace/continue` streams script continuation
- `POST /api/workspace/export` creates `json`, `fountain`, `docx`, or `pdf`
- `POST /api/soul/tts` returns MP3 audio
- `POST /api/producer/video/generate` submits HappyHorse/WAN video generation tasks
- `GET /api/producer/video/status/{task_id}` checks video task status

## Export Files

Generated export files are written to:

```text
backend/static/temp/exports/
```

The API returns a relative `download_url`, for example:

```json
{
  "message": "导出成功",
  "format": "pdf",
  "filename": "项目名-20260510145605.pdf",
  "download_url": "/static/temp/exports/项目名-20260510145605.pdf"
}
```

## Voice Clone Note

Voice clone requires DashScope to fetch the uploaded reference audio from a public URL. Local files are not reachable by DashScope unless `PUBLIC_HOST` points to a server that serves the exact uploaded file.

Current behavior:

- If cloning succeeds, the API returns a `voice_id`.
- If cloning cannot complete, the API returns `success: false` plus preset voices, so the frontend can continue with built-in voices.

For production, use OSS or a public backend host for temporary reference audio.

## Verification Summary

The latest local acceptance run used `DEV_SKIP_DB=true` with a Bailian/DashScope key provided at runtime.

Verified:

- Frontend `vite build`
- Backend Python compile checks for changed files
- Auth register/login/me/refresh
- Workspace project CRUD, scene save, and export/download in all supported formats
- Workspace streaming continue and full generate-plan pipeline
- Prophet platform stats, hot keywords, and Qwen analysis
- Soul character generation, dialogue generation, TTS, voice preview, voice clone fallback, and memory query placeholder
- Arbiter scenario generation, decision design, and streaming simulation
- Producer demo data, interaction vote/comment, production progress SSE, mock video serving, HappyHorse task submission, and task status polling
- Browser smoke test for landing page, login, project list, demos, and all seven Studio panels

One timing note: `POST /api/workspace/generate-plan` chains four LLM calls and can take around two minutes. Test it with a long timeout.

## Known Deployment Dependencies

For a full non-demo deployment, configure:

- PostgreSQL
- Redis
- Elasticsearch
- DashScope/Bailian API key
- Public file hosting for voice clone reference audio
- Optional OSS storage for generated assets

## Useful Commands

Build frontend:

```bash
npm run build
```

Backend health check:

```bash
curl http://127.0.0.1:8000/health
```

Submit a PDF export in demo mode:

```bash
curl -X POST http://127.0.0.1:8000/api/workspace/export \
  -H 'Content-Type: application/json' \
  -d '{"project_id":"demo-proj-002","format":"pdf"}'
```

