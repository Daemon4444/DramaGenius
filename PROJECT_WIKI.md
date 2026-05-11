# DramaGenius - AI 互动短剧创作平台 · 项目 Wiki

> 本文档为 AI/开发者快速 Review 整个项目而编写，涵盖架构、路由、数据流、部署、配置等全部关键信息。

---

## 1. 项目概述

**DramaGenius** 是一个 AI 驱动的互动短剧创作平台，从选题分析到成片输出提供完整的创作流水线。

### 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 18 + React Router 7 + Tailwind CSS 3.4 + Framer Motion + Vite 5 |
| 后端 | Python FastAPI + SQLAlchemy 2 (async) + PostgreSQL 16 + Redis 7 + Elasticsearch 8.15 |
| LLM | 阿里 DashScope (Qwen 3.5-plus，OpenAI 兼容 API) |
| TTS | DashScope CosyVoice v2 (语音合成 + 声音克隆) |
| 视频 | DashScope WAN 2.1 (文本生成视频，turbo/plus 两档) |
| 爬虫 | Scrapling (反爬绕过，抖音/微博/小红书/B站) |
| 任务队列 | Celery + Redis |

### 设计系统

三大核心色系：
- **Prophet** `#F59E0B` (琥珀色) - 选题/舆情
- **Soul** `#8B5CF6` (紫色) - 角色/人格
- **Arbiter** `#E11D48` (玫红色) - 剧情/决策

字体：Space Grotesk (标题) / Outfit (正文) / JetBrains Mono (代码)

---

## 2. 目录结构

```
/root/DramaGenius 3/
├── index.html                     # Vite 入口 HTML
├── package.json                   # 前端依赖
├── vite.config.js                 # Vite 配置（自定义 API 代理插件 + HTTPS）
├── tailwind.config.js             # Tailwind 配置（prophet/soul/arbiter 色系）
├── .env                           # 前端环境变量
├── .certs/                        # SSL 自签证书（开发用）
├── public/
│   └── videos/                    # Demo 视频文件（3集）
│       ├── 第一集-病榻回响.mp4
│       ├── 第二集A-遗忘.mp4
│       └── 第二集B-永生.mp4
├── dist/                          # 生产构建输出（vite build）
├── src/
│   ├── main.jsx                   # React 入口（BrowserRouter）
│   ├── App.jsx                    # 根路由定义
│   ├── index.css                  # 全局 CSS + Tailwind
│   ├── services/
│   │   └── api.js                 # 统一 API 层（REST、SSE 流式、JWT）
│   ├── hooks/
│   │   └── useSSE.js              # SSE React Hooks
│   ├── contexts/
│   │   └── AuthContext.jsx        # Auth 上下文
│   ├── components/                # Landing 页面组件
│   │   ├── Navbar.jsx             # 浮动导航栏
│   │   ├── ProphetSection.jsx     # Landing: Prophet 展示（972行）
│   │   ├── SoulSection.jsx        # Landing: Soul 展示
│   │   ├── ArbiterSection.jsx     # Landing: Arbiter 展示
│   │   ├── WorkspaceSection.jsx   # Landing: Workspace 展示
│   │   ├── DemoSection.jsx        # Landing: Demo 选项卡容器
│   │   └── demos/                 # Landing 子 Demo
│   │       ├── ProphetDemo.jsx
│   │       ├── SoulDemo.jsx
│   │       └── ArbiterDemo.jsx
│   ├── pages/
│   │   ├── LoginPage.jsx          # 登录页（演示模式：任意账密可进）
│   │   └── DemoPage.jsx           # 独立 Demo 页（视频+分镜查看器）
│   └── studio/                    # Studio 后台系统
│       ├── ProjectsPage.jsx       # 项目列表 + 创建
│       ├── StudioLayout.jsx       # 侧边栏 + Outlet 布局
│       ├── StepNav.jsx            # 上一步/下一步导航组件
│       ├── OverviewPanel.jsx      # 概览面板
│       ├── ProphetPanel.jsx       # 选题分析面板
│       ├── SoulPanel.jsx          # 角色设计面板
│       ├── ArbiterPanel.jsx       # 剧情决策面板
│       ├── ScriptPanel.jsx        # 剧本编辑面板
│       ├── ProducerPanel.jsx      # 视频制片面板
│       └── DemoPanel.jsx          # 演示播放面板
└── backend/
    ├── .env                       # 后端环境变量
    ├── requirements.txt           # Python 依赖
    ├── Dockerfile                 # Docker 镜像
    ├── docker-compose.yml         # 完整服务栈
    ├── start.sh                   # 开发启动脚本
    ├── scripts/init.sql           # 数据库初始化 SQL
    ├── mock_assets/               # Mock 视频/剧本文件
    └── app/
        ├── main.py                # FastAPI 入口（生命周期、CORS、路由、SPA 托管）
        ├── config.py              # Pydantic Settings 全局配置
        ├── models/
        │   ├── database.py        # SQLAlchemy 异步引擎 + Session
        │   ├── user.py            # User 模型
        │   ├── project.py         # Project/Character/Decision/ProphetSnapshot
        │   ├── script.py          # Episode/Scene
        │   └── producer.py        # Hotspot/VideoScript/Interaction/Vote/Comment/VideoProduction/StorylineNode/Edge
        ├── routers/
        │   ├── auth.py            # 认证：注册/登录/刷新/用户信息
        │   ├── prophet.py         # 舆情分析：趋势/热词/平台统计
        │   ├── soul.py            # 角色生成：人物/对话/TTS/声音克隆/记忆
        │   ├── arbiter.py         # 剧情决策：决策设计/SSE推演/场景生成
        │   ├── workspace.py       # 工作台：多阶段SSE/剧本续写/项目CRUD/导出
        │   └── producer.py        # 制片：热点/脚本/互动投票/视频生成(WAN)/轮询
        ├── services/
        │   ├── llm_service.py     # QwenService: 通义千问 LLM
        │   ├── voice_service.py   # VoiceService: CosyVoice TTS + 声音克隆
        │   ├── video_service.py   # VideoService: WAN 文生视频
        │   ├── producer_service.py # ProducerService: 制片业务逻辑
        │   ├── search_service.py  # SearchService: ES 搜索
        │   └── prompts.py         # 全部 LLM Prompt 模板（10个）
        ├── utils/
        │   ├── auth.py            # JWT 工具 + bcrypt
        │   └── streaming.py       # SSE 响应辅助函数
        └── crawlers/
            ├── base.py            # 爬虫基类
            ├── bilibili.py        # B站爬虫
            ├── douyin.py          # 抖音爬虫
            ├── weibo.py           # 微博爬虫
            └── xiaohongshu.py     # 小红书爬虫
```

---

## 3. 前端路由

```
/                              → LandingPage（营销首页 + Prophet/Soul/Arbiter/Workspace 展示）
/login                         → LoginPage（演示登录 - 任意账密可进）
/demo                          → DemoPage（独立视频+分镜查看器）
/studio                        → 重定向到 /studio/projects
/studio/projects               → ProjectsPage（项目列表 + 创建）
/studio/project/:projectId     → StudioLayout（侧边栏 + Outlet）
  /overview                    →   OverviewPanel（概览）
  /prophet                     →   ProphetPanel（选题分析）
  /soul                        →   SoulPanel（角色设计）
  /arbiter                     →   ArbiterPanel（剧情决策）
  /script                      →   ScriptPanel（剧本编辑）
  /producer                    →   ProducerPanel（视频制片）
  /demo                        →   DemoPanel（演示播放）
```

### 用户流程

```
Landing (/) → 点击"进入Studio" → /login → 输入任意账密 → /studio/projects → 创建/选择项目 → /studio/project/:id/overview
```

---

## 4. Studio 创作流水线（7步）

| 步骤 | 面板 | 功能 | API |
|------|------|------|-----|
| 1 | Overview | 项目概览 + 流程可视化 + "AI 一键创作" | - |
| 2 | Prophet | 输入创作方向 → AI 分析热点趋势 → 选择选题 | `POST /api/prophet/analyze` |
| 3 | Soul | 输入概念 → AI 生成3个角色（人格/背景/声音/台词） | `POST /api/soul/generate` |
| 4 | Arbiter | 输入场景 → AI 生成决策点 → 选择分支 → SSE 流式推演 | `POST /api/arbiter/generate-scenario` + `POST /api/arbiter/simulate-stream` (SSE) |
| 5 | Script | 输入概念 → 4阶段 SSE 流式生成剧本 | `POST /api/workspace/generate-plan` (SSE) |
| 6 | Producer | 逐分镜输入 Prompt → WAN 模型生成视频 → 轮询状态 | `POST /api/producer/video/generate` + `GET /api/producer/video/status/:taskId` |
| 7 | Demo | 播放已生成视频 + 查看分镜 Prompt | 纯前端（本地 MP4） |

每个面板底部都有 **StepNav** 组件，提供"上一步 / 下一步"导航按钮。

---

## 5. 后端 API 端点清单

### 认证 `/api/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/register` | 用户注册 |
| POST | `/login` | 登录，返回 JWT |
| POST | `/refresh` | 刷新 JWT |
| GET | `/me` | 获取当前用户 |

### Prophet 舆情 `/api/prophet`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/analyze` | LLM 趋势分析 → JSON (keywords/trends/sentiment/suggestions/hot_topics) |
| GET | `/hot-keywords` | 热门关键词（ES 或 demo 数据） |
| GET | `/platforms` | 平台统计 |

### Soul 角色 `/api/soul`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/generate` | AI 生成角色（3个，含人格/背景/台词/化学反应） |
| POST | `/generate-dialogue` | AI 生成对话（3句，含情感+舞台指示） |
| POST | `/tts` | CosyVoice TTS → 返回 MP3 音频流 |
| POST | `/voice-clone` | 上传音频 → 声音克隆 → 返回 voice_id |
| POST | `/voice-preview` | 语音预览 |
| POST | `/memory/query` | 角色记忆查询 |

### Arbiter 决策 `/api/arbiter`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/generate-scenario` | 生成自定义决策场景（无需认证） |
| POST | `/simulate-stream` | SSE 流式决策推演（无需认证） |
| POST | `/design` | 设计决策点（需认证） |
| POST | `/simulate` | 模拟推演（需认证，SSE） |
| GET | `/project/:id` | 获取项目决策数据 |

### Workspace 工作台 `/api/workspace`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/generate-plan` | 4阶段 SSE（Prophet→Soul→Arbiter→Outline） |
| POST | `/continue` | SSE 剧本续写 |
| POST | `/project` | 创建项目 |
| GET | `/projects` | 项目列表 |
| GET | `/project/:id` | 项目详情 |
| POST | `/export` | 导出项目 |

### Producer 制片 `/api/producer`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/hotspots` | 热点数据 |
| POST | `/hotspots/generate` | AI 生成热点分析 |
| GET | `/scripts` | 分镜脚本 |
| POST | `/scripts/generate` | AI 生成 A/B 分支脚本 |
| POST | `/scripts/parse` | 文本解析为结构化 JSON |
| GET | `/interactions` | 观众互动数据 |
| POST | `/interactions/vote` | 投票 |
| POST | `/interactions/comment` | 评论 |
| POST | `/produce/start` | 启动视频生产 |
| GET | `/produce/progress/:taskId` | SSE 生产进度 |
| GET | `/storyline` | 分支剧情线图 |
| POST | `/video/generate` | 提交 WAN 视频生成任务 |
| GET | `/video/status/:taskId` | 轮询 WAN 任务状态 |
| GET | `/videos/:name` | 获取 Mock 视频文件 |

---

## 6. 后端服务架构

### LLM 服务 (`llm_service.py`)

- **QwenService** (单例)
- 使用 `AsyncOpenAI` 指向 DashScope OpenAI 兼容端点
- 模型：`qwen3.5-plus`
- 支持：`chat()` (非流式) + `chat_stream()` (异步生成器)
- 模板方法：`analyze_trends`、`generate_characters`、`generate_voice_desc`、`design_decisions`、`continue_script_stream`、`generate_outline`、`simulate_decision`、`generate_hotspots`、`generate_video_scripts`、`parse_script_text`
- JSON 解析模式：先查 ` ```json ` 代码块 → 再查 ` ``` ` → 再尝试原始 JSON → 失败返回 mock

### 语音服务 (`voice_service.py`)

- **VoiceService** (单例)
- CosyVoice v2 via `dashscope.audio.tts_v2.SpeechSynthesizer`
- `synthesize_to_bytes()` → MP3 字节
- `create_cloned_voice()` → 使用 `VoiceEnrollmentService` + 公网音频 URL
- 5个预设声音：longxiaochun_v2 (清冷女), longxiaoya_v2 (温暖女), longcheng_v2 (低沉男), longhua_v2 (活力女), longyuan_v2 (活泼男)

### 视频服务 (`video_service.py`)

- **VideoService** (单例)
- WAN 文生视频 via `dashscope.VideoSynthesis`
- `submit_task()` → `async_call()` → 返回 task_id
- `check_status()` → `fetch()` → 返回 PENDING/RUNNING/SUCCEEDED/FAILED + video_url

### SSE 流式实现 (`streaming.py`)

- `sse_response()` — 包装异步生成器为 SSE 格式
- `sse_multi_stage_response()` — 多阶段管道（Prophet→Soul→Arbiter→Outline）
- `format_sse()` — 单条消息格式化
- 前端使用 `fetch()` + `ReadableStream` + `TextDecoder` 手动解析（非 EventSource，因需要 POST + Auth 头）

---

## 7. 数据模型

| 模型 | 表名 | 关键字段 |
|------|------|----------|
| User | `users` | id(UUID), email, name, password_hash, is_active, is_vip |
| Project | `projects` | id, user_id(FK), title, concept, genre, logline, status, outline_json |
| Character | `characters` | id, project_id(FK), name, role, age, personality(ARRAY), backstory, voice_desc, signature_line |
| Decision | `decisions` | id, project_id(FK), episode_number, scene_desc, options(JSON), dramatic_weight |
| ProphetSnapshot | `prophet_snapshots` | id, project_id(FK), query, keywords/trends/sentiment(JSON) |
| Episode | `episodes` | id, project_id(FK), ep_number, title, summary, status, word_count |
| Scene | `scenes` | id, episode_id(FK), order_idx, scene_type, content, mood, location |
| Hotspot | `hotspots` | id, project_id(FK), episode_key, tag, heat, trend(JSON), ai_suggestion |
| VideoScript | `video_scripts` | id, project_id(FK), script_key(unique), title, branch, scenes(JSON) |
| AudienceInteraction | `audience_interactions` | id, project_id(FK), episode, option_a/option_b(JSON) |
| AudienceVote | `audience_votes` | id, interaction_id(FK), user_id(FK), choice(A/B) |
| AudienceComment | `audience_comments` | id, interaction_id(FK), user_name, text |
| VideoProduction | `video_productions` | id, project_id(FK), script_id(FK), style, status, progress, video_url, task_id |
| StorylineNode | `storyline_nodes` | id, project_id(FK), node_key, title, tags(JSON), video_url, x, y |
| StorylineEdge | `storyline_edges` | id, project_id(FK), from_node, to_node, label |

---

## 8. 前端 API 层 (`src/services/api.js`)

### Token 管理
- JWT access/refresh token 存储在 `localStorage`
- 401 时自动刷新 token

### Domain APIs
```js
authApi     — login, register, getProfile, logout
prophetApi  — analyze(query), getHotTopics(limit), getSnapshot(id)
soulApi     — generateCharacters, generateDialogue, previewVoice,
              synthesizeSpeech (→ blob URL), cloneVoice (FormData), queryMemory
arbiterApi  — designDecisions, simulate, simulateStream (SSE), generateScenario
workspaceApi — createProject, getProjects, getProject, saveScene, exportProject
```

### SSE 流式
```js
streamRequest(endpoint, data, {onMessage, onError, onComplete})  // POST-based SSE
generatePlanStream(concept, callbacks)  // 4阶段 SSE
continueScriptStream(params, callbacks) // 剧本续写 SSE
```

### Mock/Real 切换
```
VITE_USE_REAL_API=true  → 调用真实后端 API
VITE_USE_REAL_API=false → 使用 Mock 数据 + setTimeout 模拟延迟
```

---

## 9. 部署方式

### 当前生产部署（单机）

```bash
# 1. 构建前端
cd "/root/DramaGenius 3" && npm run build

# 2. 启动 FastAPI（同时托管前端静态文件）
cd backend && source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 3000
```

- FastAPI 检测到 `dist/` 目录存在后自动挂载：
  - `/assets` → `dist/assets/` (JS/CSS)
  - SPA fallback: 所有非 `/api` 路径返回 `dist/index.html`
- 单端口 `3000` 同时服务 API + 前端
- 环境变量 `DEV_SKIP_DB=true` 可跳过数据库（纯 Demo 模式）

### Docker Compose（完整服务栈）

```bash
cd backend && docker compose up -d
```

服务列表：
- `api` — FastAPI (8000)
- `celery-worker` — 异步任务
- `celery-beat` — 定时爬虫
- `postgres` — PostgreSQL 16 (5432)
- `redis` — Redis 7 (6379)
- `elasticsearch` — ES 8.15 (9200)
- `kibana` — (debug, 5601)
- `pgadmin` — (debug, 5050)

### 开发模式

```bash
# 前端 Vite dev server (HTTPS, port 3000)
npm run dev

# 后端 (port 8000)
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Vite 使用自定义 `apiProxyPlugin` 将 `/api/*` 请求转发到 `127.0.0.1:8000`（用原生 Node.js http 模块，绕过 Vite 内置代理对二进制音频的处理异常）。

---

## 10. 环境变量

### 前端 `.env`

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_BASE` | `/api` | API 基础路径 |
| `VITE_USE_REAL_API` | `true` | 是否调用真实 API（false 用 mock） |

### 后端 `.env`

| 变量 | 说明 |
|------|------|
| `DASHSCOPE_API_KEY` | 阿里 DashScope API Key（LLM/TTS/视频共用） |
| `DEV_SKIP_DB` | `true` 跳过数据库连接 |
| `ENVIRONMENT` | `development` / `production` |
| `DATABASE_URL` | PostgreSQL 异步连接串 |
| `REDIS_URL` | Redis 连接串 |
| `ES_URL` | Elasticsearch URL |
| `PUBLIC_HOST` | 公网地址（声音克隆需要，如 `http://8.131.68.6:8000`） |
| `JWT_SECRET` | JWT 签名密钥 |
| `SECRET_KEY` | 应用密钥 |
| `COSYVOICE_API_KEY` | CosyVoice 专用 Key（可复用 DASHSCOPE） |
| `OSS_*` | 阿里云 OSS 配置 |
| `CORS_ORIGINS` | 允许的跨域来源 |

### 配置默认值 (`config.py`)

- `APP_NAME`: DramaGenius
- `APP_VERSION`: 1.0.0
- `API_PREFIX`: /api
- `QWEN_MODEL_*`: qwen3.5-plus
- `COSYVOICE_MODEL`: cosyvoice-v1
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`: 1440 (24h)
- `JWT_REFRESH_TOKEN_EXPIRE_DAYS`: 30

---

## 11. Prompt 模板清单 (`prompts.py`)

| 模板 | 用途 | 输出 |
|------|------|------|
| `prophet_analyze` | 趋势分析 | JSON: keywords/trends/sentiment/suggestions/hot_topics |
| `soul_character` | 角色生成 | JSON: 3个角色（人格/背景/台词/化学反应） |
| `soul_voice_desc` | 声音描述 | 文本描述 |
| `soul_dialogue` | 对话生成 | JSON: 3句台词（含情感+舞台指示） |
| `arbiter_decision` | 决策设计 | JSON: 决策点 + 变现策略 |
| `arbiter_simulate` | 决策推演 | 文本: 2-3个场景描写 |
| `workspace_continue` | 剧本续写 | 中文剧本格式文本 |
| `workspace_outline` | 大纲生成 | 6集大纲 |
| `producer_hotspot_analyze` | 热点分析 | 社媒热点 JSON |
| `producer_script_generate` | A/B 分支脚本 | 分镜脚本 JSON |
| `producer_script_parse` | 文本→结构化 | JSON |

---

## 12. Demo 内容

当前 Demo 围绕赛博朋克科幻系列《数字芯尘》：

- **EP.01 病榻回响** — 病人与意识芯片的共生关系（1:45）
- **EP.02A 遗忘** — 分支 A：病人离去，芯片独守（0:50）
- **EP.02B 永生** — 分支 B：女儿通过芯片与父亲重逢（0:30）

视频文件位于 `public/videos/`，分镜 Prompt 硬编码在 `DemoPanel.jsx` 和 `DemoPage.jsx` 中。

---

## 13. 关键实现细节

### Mock vs Real API 双模式
- 前端每个面板都有 `USE_REAL_API` 开关
- 后端 `DEV_SKIP_DB=true` 时返回 demo 数据（producer.py 有完整的 `_get_demo_*()` 系列函数）
- 多数端点支持无认证的 "demo 模式"（`get_current_user_id_optional`）

### SSE 流式通信
- 后端 `streaming.py` 提供 SSE 包装
- 前端用 `fetch()` + `ReadableStream` 手动解析（非 EventSource，因需 POST + Auth 头）
- `workspace/generate-plan` 最复杂：链式调用 4 个 LLM → 逐阶段 yield SSE 事件

### WAN 视频生成
- 提交 → `VideoSynthesis.async_call()` → task_id
- 轮询 → `VideoSynthesis.fetch()` → PENDING/RUNNING/SUCCEEDED/FAILED
- 前端 `setInterval` 每 5 秒轮询，组件卸载时清理定时器

### TTS 音频流
- `POST /api/soul/tts` → CosyVoice 合成 → 返回 MP3 bytes
- 前端 `blob` → `URL.createObjectURL()` → `<audio>` 播放

### 声音克隆
- 上传音频 → 保存到 `static/temp/` → 构造 `PUBLIC_HOST` URL → DashScope `VoiceEnrollmentService` → voice_id
- 30 秒后 `asyncio.create_task` 清理临时文件

### LLM JSON 解析
- 统一模式：查 ` ```json ` → 查 ` ``` ` → 尝试原始 JSON → 失败返回 mock

### Vite API 代理
- 自定义插件 `apiProxyPlugin` 用原生 `http.request` 转发 `/api/*`
- 解决 Vite 内置 proxy 对 `audio/mpeg` 二进制响应的处理异常

---

## 14. 快速恢复/继续开发指南

### 启动项目
```bash
# 后端（Demo 模式，无需数据库）
cd "/root/DramaGenius 3/backend"
source venv/bin/activate
DEV_SKIP_DB=true python -m uvicorn app.main:app --host 0.0.0.0 --port 3000

# 如需开发模式（热更新）
cd "/root/DramaGenius 3"
npm run dev  # 前端 port 3000
cd backend && uvicorn app.main:app --reload --port 8000  # 后端
```

### 重新构建
```bash
cd "/root/DramaGenius 3"
rm -rf dist && npm run build
# 重启后端即可
```

### 修改要点
- **新增面板**：在 `src/studio/` 创建组件 → `App.jsx` 注册路由 → `StudioLayout.jsx` 的 `NAV_ITEMS` 添加入口 → `StepNav.jsx` 的 `STEPS` 添加步骤
- **新增 API**：`backend/app/routers/` 添加路由 → `main.py` 注册 → `src/services/api.js` 添加方法
- **修改 Prompt**：`backend/app/services/prompts.py`
- **修改样式**：`tailwind.config.js`（色系/动画） + `src/index.css`（全局）

### 服务器信息
- **IP**: 8.131.68.6（阿里云）
- **访问端口**: 3000（安全组已开放）
- **Nginx**: 80/8080/8888/9999 被其他项目占用
- **注意**: 8000 端口未在阿里云安全组开放
