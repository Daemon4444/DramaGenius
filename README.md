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
- Soul character engine with character generation, dialogue generation, TTS, voice preview, OSS/public-host voice cloning, and R2V character reference images
- Arbiter decision engine with scenario generation, decision design, and streaming branch simulation
- Script workspace with episode list, AI generation, AI continuation, and copy workflow
- Producer workspace with DB-backed hotspots, scripts, audience vote/comment APIs, production progress SSE, HappyHorse/WAN text-to-video, and HappyHorse R2V reference-to-video task submission
- Demo playback pages for the two bundled projects: `浮华陷阱` and `数字芯尘：意识永生计划`
- Workspace export to `json`, `fountain`, `docx`, and `pdf`

## Bundled Project Assets

The app currently keeps two built-in showcase projects. They are intentionally project-specific: scripts, characters, branches, and videos should not cross over between projects.

### 浮华陷阱

- Project id: `proj-fuhua`
- Type: urban suspense interactive short drama
- Characters in Studio / Soul:
  - `顾晚`
  - `陆时谦`
  - `宋秘书`
- Producer imported scripts:
  - `第一集 · 猎物与猎手的名利场`
  - `第二集A · 带刺的玫瑰`
  - `第二集B · 完美的金丝雀`
  - `第二集C · 恶女的筹码`
- Demo video assets:
  - `public/drama/fuhua/浮华陷阱-第1集.mp4`
  - `public/drama/fuhua/浮华陷阱-第2集-A宁为玉碎.mp4`
  - `public/drama/fuhua/浮华陷阱-第2集-B蛰伏伪装.mp4`
  - `public/drama/fuhua/浮华陷阱-第2集-C绝地谈判.mp4`
- Source script document:
  - `public/drama/fuhua/浮华陷阱短剧剧本.docx`

### 数字芯尘：意识永生计划

- Project id: `demo-proj-002`
- Type: cyberpunk sci-fi interactive short drama
- Characters in Studio / Soul:
  - `陈国栋`
  - `纽扣芯片`
  - `陈念`
  - `主治医生`
  - `AI管理员`
- Producer imported scripts:
  - `第一集 · 病榻回响`
  - `第二集A · 遗忘`
  - `第二集B · 永生`
- Demo video assets:
  - `public/videos/第一集-病榻回响.mp4`
  - `public/videos/第二集A-遗忘.mp4`
  - `public/videos/第二集B-永生.mp4`

Unknown or newly created projects do not silently import either bundled script set. They must use their own generated or user-provided script data before production.

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
OSS_UPLOAD_PREFIX=dramagenius
PUBLIC_HOST=
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
- `POST /api/producer/references/upload` uploads a character/reference image and returns a DashScope-reachable public URL
- `POST /api/producer/video/generate` submits HappyHorse/WAN video generation tasks
- `GET /api/producer/video/status/{task_id}` checks video task status
- `GET /api/producer/produce/progress/{task_id}` streams real DashScope task polling results

## Core Character-to-Video Flow

The main production flow is:

```text
Project
  -> Prophet topic direction
  -> Soul character profiles
  -> character reference images
  -> Script scenes
  -> Producer shots
  -> HappyHorse R2V video tasks
  -> cached final MP4 URLs
```

The purpose of the R2V path is character consistency. A user can upload or paste public image URLs for each character in the Soul panel. The Producer panel reads those saved references for the same `project_id`, switches the shot model to `happyhorse-1.0-r2v`, and sends the reference images together with the shot prompt.

The verified main path is:

1. Create or open a project.
2. Add characters in Soul.
3. Upload or paste character reference images. The backend stores uploads in OSS through `POST /api/producer/references/upload`.
4. Import or write script scenes in Producer.
5. Generate a shot with `happyhorse-1.0-r2v`.
6. Poll `GET /api/producer/video/status/{task_id}` until `SUCCEEDED`.
7. The backend caches the final MP4 and returns `/api/producer/videos/<task_id>.mp4`.

HappyHorse R2V prompt convention:

- The first reference image is `character1`.
- The second reference image is `character2`.
- Continue in array order up to `character9`.
- Shot prompts should explicitly mention `character1`, `character2`, etc. when identity consistency matters.

Example Producer request:

```bash
curl -X POST http://127.0.0.1:8000/api/producer/video/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "project_id": "<project-id>",
    "shot_id": "<shot-id>",
    "model": "happyhorse-1.0-r2v",
    "prompt": "character1 stands in a rainy neon street, cinematic close-up, emotional expression, vertical short drama shot",
    "negative_prompt": "low quality, watermark, distorted face",
    "size": "720*1280",
    "duration": 5,
    "reference_image_urls": [
      "https://your-cdn.example.com/dramagenius/characters/heroine.png"
    ]
  }'
```

When `reference_image_urls` is not empty, the backend forces the model to `HAPPYHORSE_R2V_MODEL` and submits the official DashScope R2V payload shape:

```json
{
  "model": "happyhorse-1.0-r2v",
  "input": {
    "prompt": "...",
    "media": [
      { "type": "reference_image", "url": "https://..." }
    ]
  },
  "parameters": {
    "resolution": "720P",
    "ratio": "9:16",
    "duration": 5,
    "watermark": false
  }
}
```

After DashScope returns `SUCCEEDED`, `GET /api/producer/video/status/{task_id}` downloads the remote result and returns a local stable URL:

```json
{
  "task_id": "...",
  "status": "SUCCEEDED",
  "video_url": "/api/producer/videos/<task_id>.mp4",
  "cached": true
}
```

## R2V Reference Image Upload Contract

Endpoint:

```text
POST /api/producer/references/upload
Content-Type: multipart/form-data
field: image
```

Supported image types:

- JPEG / JPG
- PNG
- WEBP
- BMP

Limits:

- Maximum file size: 10 MB
- Required shortest side for HappyHorse R2V: at least 400 px
- File content must be a valid image matching the declared type; a non-image binary uploaded as `.png` will be rejected by DashScope.
- Returned URL must be reachable by DashScope from the public internet

Success response:

```json
{
  "url": "https://your-cdn.example.com/dramagenius/r2v-references/2026/05/11/xxx.png",
  "content_type": "image/png",
  "filename": "heroine.png"
}
```

Server-side implementation notes:

- Preferred implementation is OSS upload through `storage_service.upload_bytes(...)`.
- Configure `OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET`, `OSS_BUCKET_NAME`, `OSS_ENDPOINT`, and `OSS_PUBLIC_BASE_URL`.
- If OSS is not used, `PUBLIC_HOST` must point to a public backend/static host accessible by DashScope.
- Local `127.0.0.1`, `localhost`, private LAN IPs, or unsigned internal object URLs will not work for R2V.
- The frontend also accepts a manually pasted public image URL, so the server can implement separate asset management later without changing the Producer API.

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

Voice clone and R2V reference images require DashScope to fetch uploaded media from public URLs. Configure OSS for production:

```bash
OSS_ACCESS_KEY_ID=...
OSS_ACCESS_KEY_SECRET=...
OSS_BUCKET_NAME=dramagenius
OSS_ENDPOINT=oss-cn-beijing.aliyuncs.com
OSS_PUBLIC_BASE_URL=https://your-public-cdn.example.com
OSS_UPLOAD_PREFIX=dramagenius
```

If OSS is not configured, `PUBLIC_HOST` can be used as a fallback only when it is reachable by DashScope. Production mode returns an error instead of silently falling back to local-only media.

## Social Data Ingestion

Prophet uses Elasticsearch data. Run crawlers before relying on trend analysis:

```bash
cd backend
.venv/bin/python scripts/crawl_social.py --keyword 短剧 --limit 20
```

The script runs the available Weibo, Douyin, Xiaohongshu, and Bilibili crawlers and writes real crawler output into the `dramagenius_social` Elasticsearch index.

## Verification Summary

Latest local verification:

Verified:

- Backend Python compile with `backend/.venv311/bin/python -m py_compile`.
- Backend app import and Celery app import.
- Frontend production build with the bundled Node runtime.
- Project list returns only `proj-fuhua` and `demo-proj-002` for the bundled showcase state.
- Studio / Soul shows project-specific characters:
  - `proj-fuhua`: `顾晚`, `陆时谦`, `宋秘书`
  - `demo-proj-002`: `陈国栋`, `纽扣芯片`, `陈念`, `主治医生`, `AI管理员`
- Producer script import is project-specific:
  - `proj-fuhua` returns the `浮华陷阱` script set.
  - `demo-proj-002` returns the `病榻回响 / 遗忘 / 永生` script set.
  - Unknown projects return an empty script list instead of falling back to bundled scripts.
- Demo MP4 assets exist for both projects and are non-empty.
- OSS upload path was verified against an Alibaba Cloud OSS bucket.
- HappyHorse R2V was verified end-to-end with a public OSS reference image URL. The task reached `SUCCEEDED`, and the backend cached the returned video as a local MP4.
- Strict API checks proving `DEV_SKIP_DB=true` plus `ALLOW_DEMO_DATA=false` blocks fake login, in-memory projects, no-project Producer data, no-interaction votes, and demo voice preview.
- `/ready` reports missing Redis/Elasticsearch when services are not running instead of pretending readiness.

R2V validation notes from testing:

- Public OSS URL returned `200 OK`.
- Reference image must be at least `400x400`.
- Invalid image bytes with a `.png` filename are rejected by DashScope.
- Successful local test task produced `/api/producer/videos/<task_id>.mp4`.

Local limitation: this machine does not have Docker installed and ports `5432`, `6379`, and `9200` were closed, so PostgreSQL/Redis/Elasticsearch could not be started here for a live full-dependency run. Run the Compose stack above in a Docker-capable environment, then verify `/ready` returns `ready`.

## Required Deployment Dependencies

For a full non-demo deployment, configure and verify:

- PostgreSQL
- Redis
- Elasticsearch
- DashScope/Bailian API key
- Public file hosting for voice clone reference audio
- OSS storage or a DashScope-reachable `PUBLIC_HOST` for voice clone audio and R2V character images
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
