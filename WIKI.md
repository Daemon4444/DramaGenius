# DramaGenius v4 - AI 短剧创作平台

## 快速启动

```bash
# 首次使用 — 安装全部依赖并构建
bash setup.sh

# 启动服务（端口 3000，前后端同一进程）
bash start.sh

# 启动前重新构建前端
bash start.sh --build

# 自定义端口
bash start.sh --port 8080
```

启动后访问 `http://localhost:3000`。

## !! 关键注意事项 (踩坑记录)

### Python 版本
- 系统默认 `python` / `python3` 是 **3.6.8**，太旧，FastAPI/Pydantic/Uvicorn 全部不兼容
- 必须用 **`python3.11`**（路径 `/usr/bin/python3.11`）
- `start.sh` 和 `setup.sh` 已自动检测，无需手动指定

### 后端启动方式
```bash
# 正确
cd backend && python3.11 -m uvicorn app.main:app --host 0.0.0.0 --port 3000

# 错误 - 会报 "can't open file 'main.py'"
cd backend && python3.11 main.py

# 错误 - 版本太低
cd backend && python -m uvicorn app.main:app
```

### 数据库
- `backend/.env` 中 `DEV_SKIP_DB=true` 会跳过 PostgreSQL 连接
- `database.py` 已做延迟加载，DEV_SKIP_DB=true 时不会 import `asyncpg`
- 如果改回 `DEV_SKIP_DB=false`，需要额外安装 `asyncpg` 并配置 `DATABASE_URL`

### 前端构建与部署
- `npm run build` 输出到项目根目录 `dist/`
- 后端 `app/main.py` 自动检测 `dist/` 并挂载静态文件 + SPA fallback
- **修改前端代码后必须重新 `npm run build`**，后端直接托管 `dist/` 而非 dev server
- `VITE_*` 环境变量在 build 时烘焙进 JS bundle，改 `.env` 后必须重新 build

### CosyVoice 音色陷阱
- `longxiaoya_v2` 已废弃，DashScope API 返回 418 InvalidParameter
- 已替换为 `longwan_v2`，改动涉及 3 个文件（见下方音色配置节）
- 新增音色前务必先用 `dashscope.audio.tts_v2.SpeechSynthesizer` 测试能否合成

## 项目概述

DramaGenius 是一个 AI 驱动的短剧创作平台，包含四大核心模块：

| 模块 | 路由前缀 | 功能 |
|------|---------|------|
| **Prophet** | `/api/prophet` | 舆情分析、热点关键词、趋势挖掘 |
| **Soul** | `/api/soul` | 角色引擎 (人格矩阵、TTS 语音、声音克隆、AI 台词生成) |
| **Arbiter** | `/api/arbiter` | 剧情决策、分支推演、场景生成 |
| **Workspace** | `/api/workspace` | 创作工作台、项目管理、导出 |

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React + Vite + Tailwind CSS | 18.2 / 5.0 / 3.4 |
| 后端框架 | FastAPI + Uvicorn | 0.135 / 0.44 |
| Python | python3.11 | 3.11 |
| Node.js | node | v20.20.0 |
| TTS 引擎 | DashScope CosyVoice v2 | dashscope 1.25 |
| LLM | 通义千问 (OpenAI 兼容模式) | openai 2.31 |
| 数据库 | PostgreSQL + AsyncPG | 可选，DEV_SKIP_DB=true 跳过 |

## 环境变量

### 前端 `.env`（项目根目录）
```env
VITE_API_BASE=/api          # API 前缀，对应后端路由
VITE_USE_REAL_API=true      # true=调真实后端 / false=Mock+浏览器TTS
```

### 后端 `backend/.env`
```env
DEV_SKIP_DB=true                              # 跳过 PostgreSQL
DASHSCOPE_API_KEY=sk-xxxx                     # 阿里百炼 API Key（TTS + LLM）
PUBLIC_HOST=http://8.131.68.6:8000            # 声音克隆回调地址（需公网可达）
```

## CosyVoice v2 TTS 音色配置

音色 ID 在三个文件中同步维护：

| 文件 | 作用 |
|------|------|
| `backend/app/services/voice_service.py` → `VOICE_TONE_MAP` | 后端音调描述 -> 音色 ID 映射 |
| `backend/app/routers/soul.py` → `_PRESET_VOICES` | 后端预设音色列表 (声音克隆失败时返回给前端) |
| `src/components/SoulSection.jsx` → `VOICE_TONE_MAP` + `PRESET_VOICES` | 前端音调映射 + 预设列表 |

**修改音色时三个文件必须同步改。**

### 当前可用音色

| 音色 ID | 标签 | 音调映射 | 状态 |
|---------|------|---------|------|
| `longxiaochun_v2` | 清冷女声 | 清冷 | 可用 |
| `longwan_v2` | 温柔女声 | 温暖 | 可用 (替代 longxiaoya_v2) |
| `longcheng_v2` | 磁性男声 | 低沉、沉稳 | 可用 |
| `longhua_v2` | 活力女声 | 尖锐、阴冷 | 可用 |
| `longyuan_v2` | 活泼男声 | 活泼 | 可用 |

### 已验证不可用音色（418 InvalidParameter）
`longxiaoya_v2`、`longxiaoxuan_v2`、`longxiang_v2`

### 已验证可用备选音色
`longshu_v2`、`longshuo_v2`、`longmiao_v2`

### 测试音色是否可用
```python
import dashscope
from dashscope.audio.tts_v2 import SpeechSynthesizer, AudioFormat
dashscope.api_key = 'sk-xxx'
synth = SpeechSynthesizer(model='cosyvoice-v2', voice='待测音色ID', format=AudioFormat.MP3_22050HZ_MONO_256KBPS)
result = synth.call('你好世界')
print(f'{"OK" if result else "FAIL"}, {len(result) if result else 0} bytes')
```

## API 端点速查

### TTS 语音合成
```
POST /api/soul/tts
Content-Type: application/json
Body: { "text": "文本", "voice": "longxiaochun_v2", "speech_rate": 1.0, "pitch_rate": 1.0 }
Response: audio/mpeg (MP3 二进制流)
```

### 声音克隆
```
POST /api/soul/voice-clone
Content-Type: multipart/form-data
Fields: audio=<文件>, prefix="dg"
Response: { "success": true, "voice_id": "xxx" }
```
要求：音频 10-60 秒 | `PUBLIC_HOST` 公网可达 | DashScope 能 GET 到临时音频

### 角色生成
```
POST /api/soul/generate
Body: { "project_id": "demo-project", "concept": "职场复仇剧" }
Response: { "characters": [...], "chemistry": [...] }
```

### 台词生成
```
POST /api/soul/generate-dialogue
Body: { "character_name": "林夏", "personality": "...", "scene": "...", "speech_style": "", "core_desire": "" }
Response: { "dialogues": [{ "text": "...", "emotion": "...", "stage_direction": "..." }] }
```

### 健康检查
```
GET /health
Response: { "status": "ok", "app": "DramaGenius", "version": "1.0.0" }
```

## 项目结构

```
DaraGenius-v4/
├── setup.sh                      # 一键安装脚本
├── start.sh                      # 一键启动脚本
├── .env                          # 前端环境变量 (VITE_*)
├── package.json                  # Node 依赖 (React 18 + Vite 5)
├── vite.config.js
├── tailwind.config.js
├── dist/                         # 前端构建输出 (npm run build)
│
├── src/                          # 前端源码
│   ├── App.jsx                   # 主应用 (Hero, Navbar, SectionDivider, Footer)
│   ├── index.css                 # 全局样式 + 自定义动画
│   ├── services/
│   │   └── api.js                # API 层 (soulApi / prophetApi / arbiterApi / workspaceApi)
│   └── components/
│       ├── Navbar.jsx            # 导航栏 (分区域色彩)
│       ├── ProphetSection.jsx    # Prophet 舆情模块
│       ├── SoulSection.jsx       # Soul 角色模块 (TTS/克隆/角色生成/台词)
│       ├── ArbiterSection.jsx    # Arbiter 决策模块
│       └── WorkspaceSection.jsx  # Workspace 工作台
│
├── backend/                      # 后端源码
│   ├── .env                      # 后端环境变量
│   ├── requirements.txt          # Python 依赖清单
│   ├── static/temp/              # 声音克隆临时音频目录
│   └── app/
│       ├── main.py               # FastAPI 入口 (CORS, 路由注册, 静态文件托管)
│       ├── config.py             # Settings (pydantic-settings, 从 .env 加载)
│       ├── routers/
│       │   ├── auth.py           # /api/auth/*  认证
│       │   ├── prophet.py        # /api/prophet/* 舆情
│       │   ├── soul.py           # /api/soul/*  角色+TTS+克隆
│       │   ├── arbiter.py        # /api/arbiter/* 决策
│       │   ├── workspace.py      # /api/workspace/* 工作台
│       │   └── producer.py       # /api/producer/* 视频制片
│       ├── services/
│       │   ├── voice_service.py  # CosyVoice v2 封装 (合成+克隆)
│       │   ├── llm_service.py    # LLM 调用封装
│       │   └── search_service.py # Elasticsearch 封装
│       └── models/
│           └── database.py       # SQLAlchemy async (延迟加载)
```

---

## 代码逻辑详解

### 整体架构

```
浏览器
  │
  ├─ Landing Page (/) ── 单页滚动展示 Prophet / Soul / Arbiter / Workspace 四大模块
  ├─ Login (/login)
  ├─ Demo (/demo)
  └─ Studio (/studio/project/:id/*) ── 完整创作后台
        │
        ▼
  FastAPI (端口 3000)
  ├─ /api/auth/*        认证 (JWT)
  ├─ /api/prophet/*     舆情分析
  ├─ /api/soul/*        角色 + TTS + 声音克隆
  ├─ /api/arbiter/*     决策推演 (SSE 流式)
  ├─ /api/workspace/*   创作工作台 (SSE 多阶段)
  ├─ /api/producer/*    视频制片
  ├─ /health            健康检查
  ├─ /static/temp/*     声音克隆临时音频
  └─ /*                 SPA fallback → dist/index.html
```

### 前端路由 (App.jsx)

| 路径 | 组件 | 说明 |
|------|------|------|
| `*` (默认) | `LandingPage` | 首页，滚动展示四大模块 |
| `/login` | `LoginPage` | 登录页 |
| `/demo` | `DemoPage` | 演示页 |
| `/studio` | → `/studio/projects` | 重定向 |
| `/studio/projects` | `ProjectsPage` | 项目列表 |
| `/studio/project/:id` | `StudioLayout` | 项目工作台 (嵌套路由) |
| `/studio/project/:id/overview` | `OverviewPanel` | 项目概览 |
| `/studio/project/:id/prophet` | `ProphetPanel` | 舆情面板 |
| `/studio/project/:id/soul` | `SoulPanel` | 角色面板 |
| `/studio/project/:id/arbiter` | `ArbiterPanel` | 决策面板 |
| `/studio/project/:id/script` | `ScriptPanel` | 剧本面板 |
| `/studio/project/:id/producer` | `ProducerPanel` | 制片面板 |
| `/studio/project/:id/demo` | `DemoPanel` | 演示面板 |

`LandingPage` 内部结构：`Navbar` → `Hero` → `ProphetSection` → `SectionDivider` → `SoulSection` → `SectionDivider` → `ArbiterSection` → `SectionDivider` → `WorkspaceSection` → `Footer`

滚动显现动画通过 `useRevealOnScroll()` 自定义 Hook 实现，使用 `IntersectionObserver` 监听 `.reveal` 类元素进入视口后添加 `.visible` 类。

### 前端 API 服务层 (src/services/api.js)

统一的 API 封装，核心逻辑：

```
API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'
                                              ↑ 生产环境为 '/api'

所有请求 → fetch(API_BASE + endpoint) → handleResponse(res)
                                          ├─ 401 → 尝试 refreshAccessToken()
                                          ├─ !ok → throw Error(detail)
                                          └─ ok → res.json()
```

**各模块 API 对象：**

| 对象 | 关键方法 | 说明 |
|------|---------|------|
| `soulApi` | `synthesizeSpeech(text, voice, rate, pitch)` | 调 `/api/soul/tts`，返回 Blob URL |
| `soulApi` | `cloneVoice(audioFile, prefix)` | 调 `/api/soul/voice-clone`，FormData 上传 |
| `soulApi` | `generateCharacters(projectId, concept)` | 调 `/api/soul/generate`，返回角色 JSON |
| `soulApi` | `generateDialogue(name, personality, scene, ...)` | 调 `/api/soul/generate-dialogue` |
| `prophetApi` | `analyze(query)` | 调 `/api/prophet/analyze` |
| `arbiterApi` | `simulateStream(scene, question, choice, ...)` | SSE 流式调 `/api/arbiter/simulate-stream` |
| `arbiterApi` | `generateScenario(concept)` | 调 `/api/arbiter/generate-scenario` |
| `workspaceApi` | `createProject(title, concept)` | 调 `/api/workspace/project` |
| `generatePlanStream(concept, callbacks)` | - | SSE 多阶段流式 `/api/workspace/generate-plan` |
| `continueScriptStream(params, callbacks)` | - | SSE 流式 `/api/workspace/continue` |

**SSE 流式请求** 通过 `streamRequest()` 实现：`fetch` → `response.body.getReader()` → 逐行解析 `data: {...}` → 调 `onMessage` / `onComplete` 回调。

### 前端各 Section 组件逻辑

#### ProphetSection.jsx — 舆情分析

```
状态管理:
  analysisMode (realtime/trend/competitive)  → 切换数据集
  expandedKeyword (索引)                     → 展开关键词详情面板
  searchQuery + apiKeywords/apiHotTopics     → 搜索触发后端分析

数据流:
  搜索框 → prophetApi.analyze(query) → 解析返回的 keywords/sentiment/hot_topics
  ↓
  SVG 数据血缘图 (6个平台节点 → 中心核心 → 关键词气泡)
  ↓
  关键词气泡热力图 (同心环布局, 按 score 着色)
  ↓
  点击气泡 → 展开详情 (提及量/情感值/趋势) + "深度分析" / "加入方案"
```

#### SoulSection.jsx — 角色引擎

```
核心状态:
  activeChar              → 当前选中角色 ID
  allCharacters           → defaultCharacters + dynamicCharacters (AI 生成)
  expandedFeature         → 展开的功能卡 (personality/voice/memory/dialogue)
  isPlaying / ttsLoading  → TTS 播放状态
  clonedVoiceId           → 已克隆音色 ID (覆盖角色默认音色)

角色生成流程:
  概念输入 → soulApi.generateCharacters() → LLM 返回 JSON
  → mapLLMCharacter() 将 LLM 格式映射为前端格式 (大五人格/MBTI/音色/头像)
  → 追加到 dynamicCharacters → 自动切换到新角色

TTS 播放流程:
  handlePlayVoice(text)
  ├─ USE_REAL_API=true:
  │    voice = clonedVoiceId || getVoiceId(currentChar)  // 克隆优先
  │    soulApi.synthesizeSpeech(text, voice, rate, pitch)
  │    → fetch POST /api/soul/tts → res.blob() → URL.createObjectURL()
  │    → new Audio(blobUrl) → audio.play()
  │    失败时降级到 _browserTTS()
  └─ USE_REAL_API=false:
       _browserTTS() → window.speechSynthesis (Web Speech API)

声音克隆流程 (VoiceClonePanel 子组件):
  麦克风录音 (MediaRecorder API) 或 文件上传
  → soulApi.cloneVoice(blob/file, 'dg')
  → 成功返回 voice_id → setClonedVoiceId(voice_id)
  → 后续 TTS 自动使用克隆音色

音色映射 (三处同步):
  角色 voice.tone → VOICE_TONE_MAP → CosyVoice v2 音色 ID
  例: "清冷" → "longxiaochun_v2", "温暖" → "longwan_v2"
```

#### ArbiterSection.jsx — 决策推演

```
核心状态:
  activeEpisode    → 当前选中集数 (ep05/ep08/ep12/custom)
  selectedOption   → 用户选择的分支选项
  voteResult       → 投票后的结果数据 (百分比/指标)
  narrativeText    → AI 流式推演文本 (打字机效果)
  isStreaming      → 是否正在流式输出
  decisionPath     → 用户历史决策路径 [{episode, choice}]

决策推演流程:
  选择选项 → 显示投票结果 (百分比柱状图 + MetricBars)
  → "AI 推演" 按钮 → arbiterApi.simulateStream(scene, question, choice)
  → SSE 流式返回 → TypewriterText 逐字显示
  → 支持取消 (AbortController)

自定义场景:
  输入概念 → arbiterApi.generateScenario(concept)
  → LLM 返回结构化 JSON [{question, options: [{text, metrics}]}]
  → 动态替换为 custom 集数
```

#### WorkspaceSection.jsx — 创作工作台

```
四阶段状态机:
  phase: 'input' → 'processing' → 'results' → 'editor'

Phase 1 (input):
  概念输入框 + 快捷标签 (霸总甜宠/职场复仇/...)
  → 提交触发 generatePlanStream(concept)

Phase 2 (processing):
  SSE 多阶段流式:
  1. Prophet 阶段 → 返回 keywords/trends
  2. Soul 阶段   → 返回 characters
  3. Arbiter 阶段 → 返回 decisions
  4. Outline 阶段 → 返回 episodes
  进度条 + 阶段状态指示器

Phase 3 (results):
  三个 Tab 展示 AI 生成结果:
  - Prophet: 关键词/趋势
  - Soul: 角色卡片 (头像/人格/语音)
  - Arbiter: 决策点 + 变现策略
  "导出方案" / "开始创作" 按钮

Phase 4 (editor):
  三栏布局:
  左: 集数列表 (6 集)
  中: 剧本查看器 (旁白/对话/舞台指示 + AI 续写打字机效果)
  右: 角色面板 + 氛围选择器 + AI 建议
  续写: continueScriptStream() → SSE 流式输出
```

### 后端核心逻辑

#### main.py — 应用入口

```
启动流程:
  1. SSL 证书修复 (certifi)
  2. 加载 Settings (从 backend/.env)
  3. 创建 static/temp/ 目录
  4. lifespan: DEV_SKIP_DB ? 跳过DB : init_db()
  5. 挂载 /static/temp (声音克隆临时文件)
  6. 注册 CORS
  7. 注册 6 个路由模块 (auth/prophet/soul/arbiter/workspace/producer)
  8. 检测 dist/ 目录:
     ├─ 挂载 /assets (JS/CSS)
     ├─ 挂载 /videos (支持 Range 请求)
     ├─ 挂载 /public (favicon 等)
     └─ SPA fallback: 所有未匹配路径 → dist/index.html
```

#### config.py — 全局配置

`Settings(BaseSettings)` 使用 pydantic-settings 从 `backend/.env` 加载，`@lru_cache` 单例。

关键配置项：
- `DEV_SKIP_DB` → 控制是否跳过 DB/认证
- `DASHSCOPE_API_KEY` → TTS + LLM 共用
- `QWEN_MODEL_MAX/PLUS/TURBO` → 均默认 `qwen3.5-plus`
- `PUBLIC_HOST` → 声音克隆时构建音频公网 URL
- `CORS_ORIGINS` → 包含 localhost 和公网 IP 的多个端口

#### llm_service.py — LLM 调用封装

```python
class QwenService:
    client = AsyncOpenAI(
        api_key=DASHSCOPE_API_KEY,
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
    )

    chat(messages, model, temperature, max_tokens, enable_thinking)
    # → client.chat.completions.create() → 返回文本

    chat_stream(messages, ...)
    # → async generator, yield 文本片段 (SSE 用)
```

**任务专用方法** (每个方法组装 system prompt + 调 chat/chat_stream)：

| 方法 | 调用方 | 模型 | 输出 |
|------|--------|------|------|
| `analyze_trends(raw_data)` | Prophet | PLUS | JSON (keywords/trends/sentiment) |
| `generate_characters(concept)` | Soul | PLUS | JSON (characters/chemistry) |
| `generate_voice_desc(profile)` | Soul | TURBO | JSON (pitch/speed/emotion) |
| `design_decisions(outline)` | Arbiter | PLUS | JSON (decisions/monetization) |
| `simulate_decision(desc, choice)` | Arbiter | PLUS | 流式文本 (剧情叙述) |
| `generate_outline(concept, ...)` | Workspace | MAX | JSON (6 集大纲) |
| `continue_script_stream(...)` | Workspace | MAX | 流式文本 (剧本续写) |
| `generate_hotspots(...)` | Producer | PLUS | JSON (热点数据) |
| `generate_video_scripts(...)` | Producer | MAX | JSON (A/B 分支剧本) |

#### voice_service.py — CosyVoice v2 封装

```python
class VoiceService:
    synthesize_to_bytes(text, voice, speech_rate, pitch_rate)
    # → run_in_executor(同步 DashScope SDK 调用)
    # → SpeechSynthesizer(model='cosyvoice-v2', voice=voice).call(text)
    # → 返回 MP3 bytes 或 None

    create_cloned_voice(audio_url, prefix, target_model)
    # → VoiceEnrollmentService(model='voice-enrollment')
    # → service.create_voice(target_model, prefix, url, language_hints=['zh'])
    # → 返回 voice_id 或 None
```

关键：DashScope SDK 是同步阻塞的，通过 `asyncio.run_in_executor(None, sync_fn)` 包装为异步。

#### prompts.py — Prompt 模板库

纯数据模块，`PROMPT_TEMPLATES` 字典包含 11 个 system prompt：

| Key | 用途 |
|-----|------|
| `prophet_analyze` | 舆情 JSON 分析 |
| `soul_character` | 角色阵容生成 (3 人 + 关系) |
| `soul_voice_desc` | 角色音色描述 |
| `soul_dialogue` | 场景台词生成 (3 句) |
| `arbiter_decision` | 决策点设计 (选项 + 变现) |
| `arbiter_simulate` | 剧情推演叙述 |
| `workspace_continue` | 剧本续写 (编剧格式) |
| `workspace_outline` | 6 集大纲结构 |
| `producer_hotspot_analyze` | 分集热点分析 |
| `producer_script_generate` | A/B 分支脚本 |
| `producer_script_parse` | 文本→结构化 JSON |

#### 后端路由逻辑总结

**soul.py 路由：**
| 路由 | 认证 | 功能 |
|------|------|------|
| `POST /generate` | 可选 | LLM 角色生成 → JSON 解析 → Demo 模式跳过 DB |
| `POST /generate-dialogue` | 无 | LLM 台词生成 → JSON 解析 |
| `POST /tts` | 无 | CosyVoice v2 合成 → 返回 MP3 流 |
| `POST /voice-clone` | 无 | 上传音频 → 存 static/temp → DashScope 克隆 → 返回 voice_id |
| `POST /voice-preview` | 可选 | Legacy: Demo 模式返回浏览器 TTS 参数 |
| `POST /memory/query` | 无 | 占位 (向量检索待接入) |

**prophet.py 路由：**
| 路由 | 功能 |
|------|------|
| `POST /analyze` | ES 检索 → LLM 分析 → JSON |
| `GET /hot-keywords` | ES 聚合 / Demo 硬编码 |
| `GET /platforms` | 平台统计 / Demo 硬编码 |

**arbiter.py 路由：**
| 路由 | 功能 |
|------|------|
| `POST /simulate-stream` | SSE 流式剧情推演 (无需认证) |
| `POST /generate-scenario` | LLM 生成自定义决策场景 (无需认证) |
| `POST /design` | 认证 + DB: 设计决策点 |
| `POST /simulate` | 认证: 从 DB 加载决策并推演 |

**workspace.py 路由：**
| 路由 | 功能 |
|------|------|
| `POST /generate-plan` | SSE 四阶段流水线 (Prophet→Soul→Arbiter→Outline) |
| `POST /continue` | SSE 流式剧本续写 |
| `POST /project` | 创建项目 (Demo 用内存 dict) |
| `GET /projects` | 项目列表 |
| `POST /export` | 导出 (占位) |

**producer.py 路由：**
| 路由 | 功能 |
|------|------|
| `GET /hotspots` | 热点雷达 (大量 Demo 数据) |
| `POST /hotspots/generate` | LLM 生成热点 |
| `GET /scripts` | 剧本列表 (A/B 分支) |
| `POST /scripts/generate` | LLM 生成双线剧本 |
| `POST /produce/start` | 启动视频制作任务 (SSE 进度) |
| `POST /video/generate` | WAN 模型文生视频 |
| `GET /video/status/:id` | 视频生成状态轮询 |

**auth.py 路由：**
| 路由 | 功能 |
|------|------|
| `POST /register` | 注册 (Demo 返回 mock token) |
| `POST /login` | 登录 (Demo 接受任意凭据) |
| `POST /refresh` | 刷新 JWT |
| `GET /me` | 当前用户信息 |

### Vite 构建配置 (vite.config.js)

自定义 `apiProxyPlugin()` 中间件：拦截所有 `/api` 请求，用原生 `http.request` 转发到 `127.0.0.1:8000`（开发时后端端口）。不用 Vite 内置 proxy 是因为需要正确处理二进制响应（`audio/mpeg` TTS 音频）。超时 60s，失败返回 502/504。

### Tailwind 设计系统 (tailwind.config.js)

三色主题体系：
- `prophet` = amber/gold (#F59E0B) — 舆情模块
- `soul` = purple (#8B5CF6) — 角色模块
- `arbiter` = rose/red (#E11D48) — 决策模块
- `surface` = 深色背景 (#151524 系列)

自定义字体：Space Grotesk (display) / Outfit (body) / JetBrains Mono (code)
11 个自定义动画：float, pulse-soft, fade-up, scale-in, slide-right, glow, shimmer, typing-dot, blur-in, marquee 等。

---

## 前端自定义 CSS 效果

| 类名 | 效果 | 用于 |
|------|------|------|
| `glass-premium` | 毛玻璃 + 微光边框 | 主要卡片 |
| `aurora-bg` | 极光动画背景 | Hero |
| `gradient-border` | 旋转渐变边框 | 特色元素 |
| `text-shimmer` | 文字微光 | Hero 标题 |
| `hover-glow-prophet` | 悬停发光 (amber) | Prophet 区 |
| `hover-glow-soul` | 悬停发光 (violet) | Soul 区 |
| `hover-glow-arbiter` | 悬停发光 (rose) | Arbiter 区 |
| `hover-lift` | 悬停上浮 | 数据卡片 |
| `section-entrance` | 滚动进入动画 | 各 Section |
| `particles-container` | CSS 浮动粒子 | Hero 背景 |
| `spotlight-card` | 鼠标跟随聚光 | 交互卡片 |

## 常见操作

### 修改前端代码后部署
```bash
npm run build && bash start.sh
# 或
bash start.sh --build
```

### 测试单个 TTS 音色
```bash
curl -s -o test.mp3 -w "HTTP %{http_code}, %{size_download} bytes\n" \
  -X POST http://localhost:3000/api/soul/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"你好世界","voice":"longxiaochun_v2"}'
```

### 测试全部 5 个音色
```bash
for v in longxiaochun_v2 longwan_v2 longcheng_v2 longhua_v2 longyuan_v2; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/soul/tts \
    -H "Content-Type: application/json" -d "{\"text\":\"测试\",\"voice\":\"$v\"}")
  echo "$v: HTTP $code"
done
```

### 查看后端日志
服务器前台运行时日志直接输出到终端。TTS 请求日志格式：
```
INFO: 127.0.0.1:xxxx - "POST /api/soul/tts HTTP/1.1" 200 OK
```
