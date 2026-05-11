# DaraGenius v4

AI-native interactive short drama studio. DaraGenius combines trend analysis, character generation, interactive branching, script writing, video production, and playable demos into one React + FastAPI workspace.

## Tech Stack

- Frontend: React 18, Vite 5, Tailwind CSS, Framer Motion, React Router
- Backend: FastAPI, SQLAlchemy, PostgreSQL, Redis/Celery, Elasticsearch
- AI text: Alibaba Cloud Bailian / DashScope OpenAI-compatible API
- Voice: DashScope CosyVoice v2
- Video: DashScope video async task API, including HappyHorse and WAN models
- Export: JSON, Fountain, DOCX, PDF

## Main Features

- Landing page with Prophet, Soul, and Arbiter product sections
- JWT auth with PostgreSQL-backed users
- Studio project list with create/delete support
- Project overview with pipeline, metrics, recent activity, and export menu
- Prophet topic analysis with hot keywords, platform stats, and Qwen-powered trend analysis
- Soul character engine with character generation, dialogue generation, TTS, voice preview, and OSS/public-host voice cloning
- Arbiter decision engine with scenario generation, decision design, and streaming branch simulation
- Script workspace with episode list, AI generation, AI continuation, and copy workflow
- Producer workspace with DB-backed hotspots, scripts, audience vote/comment APIs, production progress SSE, and HappyHorse/WAN text-to-video task submission
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
│   ├── mock_assets/        # Optional local demo assets; disabled in production mode
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
VITE_ENABLE_DEMO_DATA=false
```

Backend variables are normally placed in `backend/.env` or provided by the process environment:

```bash
DEV_SKIP_DB=false
ALLOW_DEMO_DATA=false
DASHSCOPE_API_KEY=sk-xxx
COSYVOICE_API_KEY=sk-xxx
JWT_SECRET=replace-with-a-strong-random-string

DATABASE_URL=postgresql+asyncpg://drama:drama123@localhost:5432/dramagenius
DATABASE_SYNC_URL=postgresql+psycopg2://drama:drama123@localhost:5432/dramagenius
REDIS_URL=redis://localhost:6379/0
ES_URL=http://localhost:9200
ELASTICSEARCH_URL=http://localhost:9200

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

OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET_NAME=dramagenius
OSS_ENDPOINT=oss-cn-beijing.aliyuncs.com
OSS_PUBLIC_BASE_URL=
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

Start the production dependency stack. The repository includes `backend/docker-compose.yml` for PostgreSQL, Redis, Elasticsearch, API, and Celery:

```bash
cd backend
docker compose up -d postgres redis elasticsearch
```

Then start the API with real dependencies enabled:

```bash
cd backend
DEV_SKIP_DB=false \
ALLOW_DEMO_DATA=false \
DASHSCOPE_API_KEY=sk-xxx \
COSYVOICE_API_KEY=sk-xxx \
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

## Production Mode

Production mode is the default target for this branch:

- `DEV_SKIP_DB=false`
- `ALLOW_DEMO_DATA=false`
- `VITE_USE_REAL_API=true`
- `VITE_ENABLE_DEMO_DATA=false`

In this mode the backend does not silently return in-memory projects, demo hotspots, mock scripts, mock videos, browser TTS fallback, or fake login tokens. If PostgreSQL, Redis, Elasticsearch, DashScope, or OSS/public file hosting are missing, the relevant endpoint returns an explicit error.

Optional demo behavior is still available for local presentations, but it must be explicitly enabled with both `DEV_SKIP_DB=true` and `ALLOW_DEMO_DATA=true` on the backend plus `VITE_ENABLE_DEMO_DATA=true` on the frontend.

## API Overview

Core route groups:

- `GET /health`
- `GET /ready`
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
- `GET /api/producer/produce/progress/{task_id}` streams real DashScope task polling results

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

Voice clone requires DashScope to fetch the uploaded reference audio from a public URL. Configure OSS for production:

```bash
OSS_ACCESS_KEY_ID=...
OSS_ACCESS_KEY_SECRET=...
OSS_BUCKET_NAME=dramagenius
OSS_ENDPOINT=oss-cn-beijing.aliyuncs.com
OSS_PUBLIC_BASE_URL=https://your-public-cdn.example.com
```

If OSS is not configured, `PUBLIC_HOST` can be used as a fallback only when it is reachable by DashScope. Production mode returns an error instead of silently falling back to preset voices.

## Social Data Ingestion

Prophet uses Elasticsearch data. Run crawlers before relying on trend analysis:

```bash
cd backend
.venv/bin/python scripts/crawl_social.py --keyword 短剧 --limit 20
```

The script runs the available Weibo, Douyin, Xiaohongshu, and Bilibili crawlers and writes real crawler output into the `dramagenius_social` Elasticsearch index.

## Verification Summary

Latest local verification for the production-mode hardening:

Verified:

- Backend Python compile with `backend/.venv311/bin/python -m py_compile`.
- Backend app import and Celery app import.
- Frontend production build with the bundled Node runtime.
- Strict API checks proving `DEV_SKIP_DB=true` plus `ALLOW_DEMO_DATA=false` blocks fake login, in-memory projects, no-project Producer data, no-interaction votes, and demo voice preview.
- `/ready` reports missing Redis/Elasticsearch when services are not running instead of pretending readiness.

Local limitation: this machine does not have Docker installed and ports `5432`, `6379`, and `9200` were closed, so PostgreSQL/Redis/Elasticsearch could not be started here for a live full-dependency run. Run the Compose stack above in a Docker-capable environment, then verify `/ready` returns `ready`.

## Required Deployment Dependencies

For a full non-demo deployment, configure and verify:

- PostgreSQL
- Redis
- Elasticsearch
- DashScope/Bailian API key
- Public file hosting for voice clone reference audio
- OSS storage or a DashScope-reachable `PUBLIC_HOST`
- Real crawler data in Elasticsearch

## Useful Commands

Build frontend:

```bash
npm run build
```

Backend health check:

```bash
curl http://127.0.0.1:8000/health
```

Dependency readiness check:

```bash
curl http://127.0.0.1:8000/ready
```

Run crawler ingestion:

```bash
cd backend
.venv/bin/python scripts/crawl_social.py --keyword 短剧 --limit 20
```

Submit a PDF export for a real project:

```bash
curl -X POST http://127.0.0.1:8000/api/workspace/export \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"project_id":"<real-project-id>","format":"pdf"}'
```
