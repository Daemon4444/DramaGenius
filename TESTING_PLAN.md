# DaraGenius-v4 测试计划 (TESTING_PLAN.md)

## 1. 现状概述

| 维度 | 状态 |
|------|------|
| 后端测试文件 | 无 |
| 前端测试文件 | 无 |
| 测试框架依赖 | 未安装 |
| CI/CD 集成 | 无 |

---

## 2. 测试框架选型

### 后端 (Python / FastAPI)
| 工具 | 用途 |
|------|------|
| `pytest` | 测试运行器 |
| `pytest-asyncio` | 异步测试支持 |
| `httpx` (已有) | FastAPI TestClient (async) |
| `factory-boy` | 测试数据工厂 |
| `pytest-mock` / `unittest.mock` | Mock 外部服务 |
| `testcontainers` | 集成测试真实 PostgreSQL/Redis/ES |
| `pytest-cov` | 覆盖率报告 |

### 前端 (React / Vite)
| 工具 | 用途 |
|------|------|
| `vitest` | 测试运行器 (与 Vite 原生集成) |
| `@testing-library/react` | 组件渲染与交互 |
| `@testing-library/jest-dom` | DOM 断言增强 |
| `jsdom` | 浏览器环境模拟 |
| `msw` (Mock Service Worker) | API Mock / SSE Mock |
| `@vitest/coverage-v8` | 覆盖率 |

---

## 3. 后端测试计划

### 3.1 单元测试 (Unit Tests)

#### P0 - 最高优先级 (核心业务逻辑)

| # | 模块 | 测试目标 | 关键用例 |
|---|------|----------|----------|
| U1 | `app/utils/auth.py` | JWT 令牌生成/解析、密码哈希 | 正确生成 token、过期 token 拒绝、无效签名拒绝、refresh token 刷新、bcrypt 哈希/验证 |
| U2 | `app/services/llm_service.py` (QwenService) | LLM 调用封装 | Mock openai client，验证 prompt 拼接、JSON 解析、`<think>` 标签剥离、code fence 提取、异常降级 |
| U3 | `app/services/producer_service.py` | 视频制作管线 | 脚本生成逻辑、热点分析结果结构、投票计数、弹幕写入、storyline 图初始化 |
| U4 | `app/services/video_service.py` (VideoService) | 视频生成任务管理 | 模型别名归一化 (`normalize_model`)、任务提交参数构造、状态轮询逻辑、SDK/HTTP 降级 |
| U5 | `app/services/voice_service.py` (VoiceService) | TTS 合成 | 音色映射 (`tone_to_voice_id`)、合成字节流验证、克隆参数构造 |
| U6 | `app/services/storage_service.py` | OSS 上传 | 签名 URL 生成、过期时间、路径拼接 |
| U7 | `app/utils/streaming.py` | SSE 响应工具 | `format_sse` 格式正确性、`sse_response` 异常处理、多阶段包装 |

#### P1 - 高优先级 (数据层)

| # | 模块 | 测试目标 | 关键用例 |
|---|------|----------|----------|
| U8 | `app/models/user.py` | User 模型 | 字段默认值、UUID 生成、关系绑定 |
| U9 | `app/models/project.py` | Project/Character/Decision 模型 | JSON 字段序列化/反序列化、级联关系、枚举值约束 |
| U10 | `app/models/script.py` | Episode/Scene 模型 | order_idx 排序、scene_type 枚举 |
| U11 | `app/models/producer.py` | 所有 Producer 模型 | UniqueConstraint (project_id, script_key)、vote 关联、storyline node/edge 结构 |
| U12 | `app/services/search_service.py` | ES 搜索服务 | 查询构造、聚合解析、平台统计格式、空结果处理 |

#### P2 - 中优先级 (辅助模块)

| # | 模块 | 测试目标 | 关键用例 |
|---|------|----------|----------|
| U13 | `app/services/prompts.py` | Prompt 模板 | 模板变量完整性、无语法错误 |
| U14 | `app/crawlers/` | 爬虫解析逻辑 | HTML 解析提取（mock HTML）、数据结构标准化 |
| U15 | `app/config.py` | 配置加载 | 环境变量读取、默认值、类型校验 |

---

### 3.2 集成测试 (Integration Tests)

#### P0 - 认证流程

| # | 接口 | 测试目标 |
|---|------|----------|
| I1 | `POST /api/auth/register` | 正常注册、重复邮箱 409、无效邮箱 422、密码过短 |
| I2 | `POST /api/auth/login` | 正确登录返回 token、错误密码 401、不存在用户 401 |
| I3 | `POST /api/auth/refresh` | 有效 refresh token 换发、过期 token 拒绝 |
| I4 | `GET /api/auth/me` | 有效 token 返回用户信息、无 token 返回 401 |

#### P0 - Workspace 核心流程

| # | 接口 | 测试目标 |
|---|------|----------|
| I5 | `POST /api/workspace/project` | 创建项目 (含 concept)、缺少必填字段 422 |
| I6 | `GET /api/workspace/projects` | 列表分页、仅返回当前用户项目 |
| I7 | `GET /api/workspace/project/{id}` | 正确获取、404 不存在、权限隔离 |
| I8 | `DELETE /api/workspace/project/{id}` | 删除成功、非所有者 403 |
| I9 | `POST /api/workspace/generate-plan` | SSE 流响应完整性 (mock LLM) |
| I10 | `POST /api/workspace/continue` | 续写流正常输出 |
| I11 | `POST /api/workspace/export` | DOCX/PDF/JSON 导出文件格式验证 |

#### P1 - Prophet 模块

| # | 接口 | 测试目标 |
|---|------|----------|
| I12 | `POST /api/prophet/analyze` | 正常分析 (mock ES + LLM)、空数据降级 |
| I13 | `GET /api/prophet/hot-keywords` | ES 聚合结果、LLM fallback 路径 |
| I14 | `GET /api/prophet/platforms` | 平台统计格式 |

#### P1 - Soul 模块

| # | 接口 | 测试目标 |
|---|------|----------|
| I15 | `POST /api/soul/generate` | 角色生成 JSON 结构、角色数量控制 |
| I16 | `POST /api/soul/generate-dialogue` | 对话生成格式 |
| I17 | `POST /api/soul/tts` | TTS 返回 MP3 音频流 (mock DashScope) |
| I18 | `POST /api/soul/voice-clone` | 文件上传 + 克隆请求构造 |
| I19 | `POST /api/soul/memory/query` | 返回 501 Not Implemented |

#### P1 - Arbiter 模块

| # | 接口 | 测试目标 |
|---|------|----------|
| I20 | `POST /api/arbiter/generate-scenario` | 场景生成结构 |
| I21 | `POST /api/arbiter/design` | 决策点设计 + DB 持久化 |
| I22 | `POST /api/arbiter/simulate` | SSE 流式模拟 |
| I23 | `POST /api/arbiter/simulate-stream` | 免登录 demo 流 |

#### P1 - Producer 模块

| # | 接口 | 测试目标 |
|---|------|----------|
| I24 | `POST /api/producer/scripts/generate` | A/B 分支脚本生成 |
| I25 | `POST /api/producer/scripts/parse` | 文本剧本 -> JSON 结构化 |
| I26 | `POST /api/producer/interactions/vote` | 投票计数、重复投票处理 |
| I27 | `POST /api/producer/interactions/comment` | 弹幕写入 |
| I28 | `POST /api/producer/produce/start` | 视频制作任务提交 |
| I29 | `GET /api/producer/produce/progress/{task_id}` | SSE 进度推送 |
| I30 | `POST /api/producer/video/generate` | DashScope 视频任务 (mock) |
| I31 | `GET /api/producer/video/status/{task_id}` | 任务状态查询 |
| I32 | `POST /api/producer/references/upload` | 图片/视频上传至 OSS |

#### P2 - 基础设施

| # | 接口 | 测试目标 |
|---|------|----------|
| I33 | `GET /health` | 返回 200 + 正确 JSON |
| I34 | `GET /ready` | DB/Redis/ES 连接检查 |
| I35 | 静态文件路由 | SPA fallback、视频 Range 请求 |

---

### 3.3 边缘用例与异常测试

| # | 场景 | 测试目标 |
|---|------|----------|
| E1 | LLM 返回非法 JSON | `QwenService` 优雅降级，不抛出未处理异常 |
| E2 | LLM 返回带 `<think>` 标签 | 正确剥离后解析 |
| E3 | DashScope 视频任务超时 | `VideoService` 超时处理 |
| E4 | ES 服务不可用 | Prophet 接口 LLM fallback 路径生效 |
| E5 | Redis 连接断开 | 不影响核心 API（降级行为） |
| E6 | 数据库连接池耗尽 | 返回 503 而非挂死 |
| E7 | 超大文本输入 (>100KB) | 接口截断/拒绝，不 OOM |
| E8 | 并发投票竞态 | vote 计数原子性 |
| E9 | 无效 UUID 路径参数 | 返回 422 而非 500 |
| E10 | JWT 被篡改 payload | 签名验证失败返回 401 |
| E11 | 文件上传超大文件 | 返回 413 或截断 |
| E12 | SSE 连接中断 | 流优雅关闭，不泄漏资源 |
| E13 | DEV_SKIP_DB=true 模式 | 所有接口返回 mock 数据或 503 |
| E14 | OSS 上传失败 | 返回明确错误而非 500 |

---

## 4. 前端测试计划

### 4.1 单元测试 (Unit Tests)

#### P0 - 核心服务层

| # | 模块 | 测试目标 | 关键用例 |
|---|------|----------|----------|
| F1 | `src/services/api.js` | API 客户端 | Token 附加、401 自动 refresh、refresh 失败 logout、baseURL 构建 |
| F2 | `src/services/api.js` (streamRequest) | SSE 流处理 | 数据解析、error 事件、abort 中断、重连逻辑 |
| F3 | `src/hooks/useSSE.js` | SSE Hooks | `useSSE` 状态流转、`useMultiStageSSE` 阶段切换、`useTypewriter` 逐字输出、cleanup |
| F4 | `src/contexts/AuthContext.jsx` | 认证上下文 | login/register/logout 状态更新、token 持久化、isAuthenticated 计算 |

#### P1 - 组件渲染

| # | 组件 | 测试目标 | 关键用例 |
|---|------|----------|----------|
| F5 | `Navbar` | 导航栏 | 登录/未登录状态切换、路由链接正确 |
| F6 | `ErrorBoundary` | 错误边界 | 子组件抛错时渲染 fallback UI |
| F7 | `LoginPage` | 登录页 | 表单验证、提交调用 authApi、错误提示 |
| F8 | `ProjectsPage` | 项目列表 | 加载态、空态、列表渲染、创建项目弹窗 |
| F9 | `StudioLayout` | Studio 布局 | 侧边栏导航、子路由切换、项目数据加载 |
| F10 | `StepNav` | 步骤导航 | 当前步骤高亮、点击切换 |

#### P2 - 业务面板

| # | 组件 | 测试目标 | 关键用例 |
|---|------|----------|----------|
| F11 | `ProphetPanel` | 舆情分析面板 | 触发分析、流式结果渲染、热词展示 |
| F12 | `SoulPanel` | 角色面板 | 角色生成、角色卡渲染、TTS 播放按钮、声音克隆上传 |
| F13 | `ArbiterPanel` | 决策面板 | 决策点列表、模拟触发、SSE 结果展示 |
| F14 | `ScriptPanel` | 剧本面板 | 场景列表、续写流、保存操作 |
| F15 | `ProducerPanel` | 制片面板 | 镜头管理、视频生成触发、进度轮询、时间线播放 |
| F16 | `OverviewPanel` | 概览面板 | 大纲生成 (多阶段 SSE)、数据展示 |
| F17 | `DemoPanel` | 演示面板 | 分支选择、视频播放、弹幕展示 |

---

### 4.2 集成测试 (Integration Tests)

| # | 流程 | 测试目标 |
|---|------|----------|
| FI1 | 注册 -> 登录 -> 进入 Studio | 完整认证流程 (msw mock API) |
| FI2 | 创建项目 -> Overview 生成大纲 | 项目创建 + SSE 多阶段流 |
| FI3 | Prophet 分析 -> 查看结果 | API 调用 + 数据渲染 |
| FI4 | Soul 生成角色 -> TTS 试听 | 角色卡渲染 + 音频播放 |
| FI5 | Arbiter 设计决策 -> 模拟 | 决策流 + SSE 响应 |
| FI6 | Producer 添加镜头 -> 生成视频 -> 预览 | 完整制片流程 |
| FI7 | Demo 页面分支交互 | 观众选择 -> 视频切换 -> 弹幕 |
| FI8 | Token 过期 -> 自动刷新 -> 继续操作 | 无感刷新 |
| FI9 | 路由守卫 | 未登录访问 /studio 跳转 /login |

---

### 4.3 边缘用例

| # | 场景 | 测试目标 |
|---|------|----------|
| FE1 | API 返回 500 | 错误提示展示，不白屏 |
| FE2 | SSE 连接中断 | 流式 UI 优雅降级，显示已接收内容 |
| FE3 | 网络断开 | 请求失败提示 |
| FE4 | localStorage 数据损坏 | 读取异常不崩溃 |
| FE5 | 超长文本输入 | UI 不溢出 |
| FE6 | 并发多次点击提交 | 防重复提交 |
| FE7 | 空项目 (无角色/无剧本) | 各面板空态 UI |
| FE8 | 视频生成轮询超限 (120次) | 超时提示 |
| FE9 | 大量角色/镜头渲染 | 性能不劣化 (>20 角色) |
| FE10 | Demo mock 模式 (`VITE_USE_REAL_API=false`) | 所有功能正常使用本地数据 |

---

## 5. 测试目录结构建议

```
DaraGenius-v4/
├── backend/
│   ├── tests/
│   │   ├── conftest.py              # fixtures: db session, test client, auth helpers
│   │   ├── factories.py             # factory-boy 数据工厂
│   │   ├── unit/
│   │   │   ├── test_auth_utils.py
│   │   │   ├── test_llm_service.py
│   │   │   ├── test_producer_service.py
│   │   │   ├── test_video_service.py
│   │   │   ├── test_voice_service.py
│   │   │   ├── test_storage_service.py
│   │   │   ├── test_search_service.py
│   │   │   ├── test_streaming.py
│   │   │   └── test_models.py
│   │   ├── integration/
│   │   │   ├── test_auth_api.py
│   │   │   ├── test_workspace_api.py
│   │   │   ├── test_prophet_api.py
│   │   │   ├── test_soul_api.py
│   │   │   ├── test_arbiter_api.py
│   │   │   └── test_producer_api.py
│   │   └── edge/
│   │       ├── test_llm_edge_cases.py
│   │       ├── test_concurrency.py
│   │       └── test_resilience.py
│   ├── pytest.ini
│   └── requirements-test.txt
├── src/
│   └── __tests__/                   # 或 tests/ 目录
│       ├── setup.js                 # vitest global setup
│       ├── mocks/
│       │   └── handlers.js          # msw request handlers
│       ├── unit/
│       │   ├── api.test.js
│       │   ├── useSSE.test.js
│       │   ├── AuthContext.test.jsx
│       │   ├── Navbar.test.jsx
│       │   └── ErrorBoundary.test.jsx
│       ├── integration/
│       │   ├── auth-flow.test.jsx
│       │   ├── project-creation.test.jsx
│       │   ├── producer-flow.test.jsx
│       │   └── demo-branch.test.jsx
│       └── edge/
│           ├── error-handling.test.jsx
│           └── sse-interruption.test.jsx
├── vitest.config.js
```

---

## 6. 优先级执行路线图

### Phase 1 - 基础设施搭建 (Day 1)
- 安装后端测试依赖 (`requirements-test.txt`)
- 安装前端测试依赖 (vitest, testing-library, msw)
- 编写 `conftest.py` (TestClient, DB fixture, mock factories)
- 编写 `vitest.config.js` + msw handlers

### Phase 2 - P0 后端单元测试 (Day 2-3)
- U1: auth 工具测试
- U2: LLM 服务测试 (mock openai)
- U3-U6: 各服务单元测试

### Phase 3 - P0 后端集成测试 (Day 4-5)
- I1-I4: 认证流程
- I5-I11: Workspace 全流程

### Phase 4 - P0 前端测试 (Day 6-7)
- F1-F4: 服务层与 hooks
- FI1-FI2: 核心集成流程

### Phase 5 - P1 全栈测试 (Day 8-10)
- 后端 Prophet/Soul/Arbiter/Producer 集成测试
- 前端业务面板组件测试

### Phase 6 - 边缘用例与韧性测试 (Day 11-12)
- E1-E14 + FE1-FE10

---

## 7. 覆盖率目标

| 层 | 目标 |
|----|------|
| 后端 services/ | ≥ 85% |
| 后端 routers/ (接口) | ≥ 80% |
| 后端 models/ | ≥ 70% |
| 前端 services/ + hooks/ | ≥ 90% |
| 前端 组件 | ≥ 60% |
| 总体 | ≥ 75% |

---

## 8. 已确认决策

| # | 问题 | 决策 |
|---|------|------|
| 1 | DEV_SKIP_DB (demo 模式) | **需要单独测试** - 验证所有接口在 demo 模式下 mock 数据路径完整性 |
| 2 | 爬虫模块 | **两者都测** - HTML 解析用 fixtures 做单元测试 + 真实网络做集成测试 |
| 3 | DashScope 视频/TTS | **用测试 Key 做冒烟测试** - 非纯 mock，需真实调用验证端到端 |
| 4 | 性能基线 | **不需要** - 不纳入测试范围 |

---

## 9. 补充测试项 (基于确认决策)

### 9.1 DEV_SKIP_DB Demo 模式测试

| # | 测试目标 | 关键用例 |
|---|----------|----------|
| D1 | 所有 API 在 DEV_SKIP_DB=true 下可用 | 每个路由返回 mock 数据或 503，不抛 500 |
| D2 | Demo 项目数据完整性 | "浮华陷阱" + "数字芯尘" 的角色/剧本/决策数据结构正确 |
| D3 | Demo 模式不写入任何持久层 | 无 DB/Redis/ES 调用 |
| D4 | Demo -> 真实模式切换 | 切换环境变量后服务正常启动 |

### 9.2 爬虫网络集成测试 (标记 `@pytest.mark.network`)

| # | 测试目标 | 关键用例 |
|---|----------|----------|
| C1 | Douyin 热榜抓取 | 连通性 + 返回数据结构校验 |
| C2 | Weibo 热搜抓取 | 连通性 + 数据结构校验 |
| C3 | Xiaohongshu 搜索 | 连通性 + 数据结构校验 |
| C4 | Bilibili API 搜索 | 连通性 + 数据结构校验 |
| C5 | 网站反爬变更检测 | 结果非空断言，失败时标记为 flaky 而非 error |

### 9.3 DashScope 冒烟测试 (标记 `@pytest.mark.smoke`)

| # | 测试目标 | 关键用例 |
|---|----------|----------|
| S1 | Qwen LLM 调用 | 简单 prompt -> 有效响应 (非空、合理 token 数) |
| S2 | CosyVoice TTS | 短文本 -> 返回有效 MP3 字节流 |
| S3 | 视频生成任务提交 | 提交任务 -> 获得 task_id -> 查询状态非 UNKNOWN |
| S4 | 图像生成 | 简单 prompt -> 返回有效图片 URL |
| S5 | API Key 有效性 | Key 过期/无效时返回明确错误而非 hang |

> **注意**：冒烟测试需要环境变量 `DASHSCOPE_API_KEY` 配置有效测试 Key，在 CI 中通过 secrets 注入，本地通过 `.env.test` 文件加载。
