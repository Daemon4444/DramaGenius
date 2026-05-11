# DramaGenius 开发进度

> 最后更新: 2026-04-03

---

## 📊 整体进度

| 模块 | 状态 | 说明 |
|------|------|------|
| 前端官网 | ✅ 完成 | React + Vite + Tailwind，四板块架构 |
| 前端交互增强 | 🔄 进行中 | 搜索分析、角色生成器、API 连接 |
| 后端框架 | ✅ 完成 | FastAPI + 路由 + 服务层 |
| 爬虫系统 | ✅ 完成 | 4平台爬虫已实测通过 |
| LLM 集成 | ✅ 完成 | 通义千问 DashScope SDK |
| API 连接 | 🔄 进行中 | 前后端联调中 |
| 数据库 | 🔧 待配置 | PostgreSQL + Redis + ES (开发模式可跳过) |

---

## 🚀 部署信息

### 服务器
- **公网 IP**: 39.105.206.107
- **前端**: http://39.105.206.107:5173
- **后端 API**: http://39.105.206.107:8000
- **API 文档**: http://39.105.206.107:8000/docs

### 启动命令
```bash
# 前端
cd "/root/DramaGenius 3"
npm run dev -- --host 0.0.0.0 --port 5173

# 后端
cd "/root/DramaGenius 3/backend"
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 🎨 前端架构

### 技术栈
- React 18 + Vite 5
- Tailwind CSS 3.4
- SSE 流式响应

### 组件结构
```
src/
├── App.jsx                 # 主应用入口
├── components/
│   ├── Navbar.jsx          # 导航栏
│   ├── ProphetSection.jsx  # 舆情分析模块 ✅ 已增强搜索分析
│   ├── SoulSection.jsx     # 角色引擎模块 ✅ 已添加角色生成器
│   ├── ArbiterSection.jsx  # 决策引擎模块
│   ├── WorkspaceSection.jsx # 创作工作台
│   └── ui/                 # 通用 UI 组件
├── services/
│   └── api.js              # API 服务层 (支持 SSE)
├── hooks/
│   └── useSSE.js           # SSE 流式 Hook
└── contexts/               # React Context
```

### 页面结构
1. **Hero** - 品牌展示、核心价值主张
2. **Prophet Section** - 舆情血缘可视化、关键词热力图、搜索分析
3. **Soul Section** - 角色人格建模、记忆库、语音克隆、AI 生成器
4. **Arbiter Section** - 决策点设计、分支线规划
5. **Workspace Section** - 剧本创作工作台、AI 续写

---

## 🔧 后端架构

### 目录结构
```
backend/
├── app/
│   ├── main.py           # FastAPI 入口
│   ├── config.py         # 配置管理
│   ├── crawlers/         # 爬虫模块
│   │   ├── base.py       # 基类 + SocialPost 模型
│   │   ├── bilibili.py   # B站爬虫
│   │   ├── weibo.py      # 微博爬虫
│   │   ├── douyin.py     # 抖音爬虫
│   │   └── xiaohongshu.py # 小红书爬虫
│   ├── routers/          # API 路由
│   │   ├── auth.py       # 认证
│   │   ├── prophet.py    # 舆情分析
│   │   ├── soul.py       # 角色塑造
│   │   ├── arbiter.py    # 决策引擎
│   │   └── workspace.py  # 创作工作台 (SSE 流式)
│   ├── services/         # 业务逻辑
│   │   ├── llm_service.py    # LLM 调用
│   │   ├── prompts.py        # Prompt 模板
│   │   └── streaming.py      # SSE 流式输出
│   ├── models/           # 数据模型
│   └── utils/            # 工具函数
├── .env                  # 环境配置
├── requirements.txt      # Python 依赖
└── start.sh              # 启动脚本
```

### API 端点

| 路由 | 方法 | 功能 | 状态 |
|------|------|------|------|
| `/health` | GET | 健康检查 | ✅ |
| `/api/prophet/analyze` | POST | 舆情分析 | ✅ |
| `/api/prophet/hot-keywords` | GET | 热门关键词 | ✅ |
| `/api/soul/generate` | POST | 生成角色 | ✅ |
| `/api/arbiter/design` | POST | 决策设计 | ✅ |
| `/api/workspace/generate-plan` | POST | 方案生成 (SSE) | ✅ |
| `/api/workspace/continue` | POST | 剧本续写 (SSE) | ✅ |

---

## ⚙️ 配置说明

### 环境变量 (.env)

#### 前端
```bash
VITE_API_BASE=/api
VITE_USE_REAL_API=true
```

#### 后端
```bash
# 开发模式 - 跳过数据库
DEV_SKIP_DB=true

# LLM 配置 (必填)
DASHSCOPE_API_KEY=sk-xxx

# 数据库 (完整模式需要)
DATABASE_URL=postgresql+asyncpg://drama:drama123@localhost:5432/dramagenius
REDIS_URL=redis://localhost:6379/0
ES_URL=http://localhost:9200
```

---

## 🕷️ 爬虫系统 (已验证可用)

### 技术栈
- **框架**: Scrapling v0.4.3 (StealthyFetcher 反爬绕过)
- **依赖**: `scrapling curl_cffi browserforge patchright camoufox`

### 平台爬虫

| 平台 | 文件 | 方式 | 实测结果 |
|------|------|------|----------|
| B站 | `bilibili.py` | 公开 API | ✅ JSON 数据正常 |
| 微博 | `weibo.py` | StealthyFetcher | ✅ 53 条热搜 |
| 抖音 | `douyin.py` | StealthyFetcher | ✅ 40 个视频 |
| 小红书 | `xiaohongshu.py` | StealthyFetcher | ✅ 28 个笔记 |

---

## 📝 开发日志

### 2026-04-03
- ✅ 项目部署到阿里云服务器
- ✅ 前端 Vite 服务 (端口 5173)
- ✅ 后端 FastAPI 服务 (端口 8000)
- ✅ ProphetSection 搜索分析功能
  - 添加搜索输入框
  - 连接 `/api/prophet/analyze` API
  - 情感分析展示
  - 深度分析按钮
- ✅ SoulSection 角色生成器
  - AI 角色生成 UI
  - 连接 `/api/soul/generate` API
  - 对话生成器增强
- ✅ ArbiterSection 决策模拟
  - 模拟决策走向按钮
  - 预测互动率、收入、观众情绪
  - 连接 `/api/arbiter/simulate` API
- ✅ 环境变量配置 (.env)

### 2026-03-31
- ✅ 前端官网四板块架构完成
- ✅ 后端 API 框架完成
- ✅ LLM 服务集成
- ✅ SSE 流式输出实现

---

## 📋 下一步计划

### 优先级高
1. [ ] Workspace 完整 API 对接
2. [ ] Arbiter 决策模拟功能
3. [ ] 用户认证流程测试

### 优先级中
4. [ ] Docker Compose 完整环境
5. [ ] 剧本导出功能 (DOCX/PDF)
6. [ ] 数据持久化测试

### 优先级低
7. [ ] CosyVoice 语音合成集成
8. [ ] 阿里云 OSS 文件存储
9. [ ] 微信登录

---

## 🔑 关键依赖版本

### 前端
```
react: ^18.2.0
vite: ^5.0.0
tailwindcss: ^3.4.0
```

### 后端
```
fastapi: 0.115.0
uvicorn: 0.30.6
scrapling: 0.2.99
dashscope: 1.20.11
sqlalchemy: 2.0.35
elasticsearch: 8.15.1
redis: 5.1.0
```

---

## 📌 备注

- 爬虫使用 **Scrapling** 框架，StealthyFetcher 可绕过主流网站反爬
- 微博/抖音/小红书需要 StealthyFetcher 隐身模式
- B站使用公开 API，需设置 Referer 和 Accept 头
- LLM 默认使用 `qwen-max`，可在 config.py 切换模型
- 开发模式设置 `DEV_SKIP_DB=true` 可跳过数据库连接