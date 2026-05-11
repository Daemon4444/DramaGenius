# DaraGenius-v4 已修复清单

> 本文档记录 2026-04-14 审查后已修复的功能完善度问题。

---

## ✅ 已修复问题

### 1. 认证系统 (40% → 80%)

**修复内容**:
- `src/pages/LoginPage.jsx`: 添加真实 API 登录逻辑，支持 `USE_REAL_API` 模式
- `backend/app/routers/auth.py`: 增加 `DEV_SKIP_DB` 模式，Demo 环境下任意账密可登录
- 添加错误提示 UI 显示

**修复后**:
- Demo 模式: 任意账密登录 → 获取 mock token
- 真实 API 模式: 调用 `/api/auth/login` → 获取 JWT token

---

### 2. 项目管理 (未实现 → 70%)

**修复内容**:
- `src/studio/ProjectsPage.jsx`: 对接 `workspaceApi.getProjects()` 和 `createProject()`
- `backend/app/routers/workspace.py`: 增加 Demo 模式内存存储 `_demo_projects`
- 添加加载状态、错误提示、创建中状态 UI

**修复后**:
- Demo 模式: 内存存储 + 默认 mock 项目
- 真实 API 模式: 调用后端 API 创建/获取项目

---

### 3. Arbiter 决策 (60% → 75%)

**修复内容**:
- `backend/app/routers/arbiter.py`: 统一 `generate-scenario` 返回格式为 `{ decisions: [...] }`
- 每个决策包含 `id, scene, question, choices` 字段
- 增加默认 fallback 数据

**修复后**:
- 前后端数据结构统一，前端 `ArbiterPanel.jsx` 可正确解析

---

### 4. Script 剧本 (50% → 70%)

**修复内容**:
- `src/studio/ScriptPanel.jsx`: 完善 SSE 事件处理
  - 支持 `stage_start`, `stage_end`, `stage_progress` 事件
  - 添加阶段进度显示
  - 添加取消生成按钮
  - 组件卸载时正确取消 SSE 连接

**修复后**:
- 4阶段流式生成时前端可显示当前阶段
- 可中途取消生成任务

---

### 5. Producer 制片 (55% → 75%)

**修复内容**:
- `src/studio/ProducerPanel.jsx`: 完善进度追踪
  - 添加 `progress` 字段追踪生成进度
  - 增加进度条 UI 显示
  - 添加取消任务功能
  - 增加超时处理（最大轮询120次）
  - 统一 WAN 模型命名 (`wan2.1-t2v-turbo`)

**修复后**:
- 视频生成时可显示实时进度
- 可取消正在进行的任务
- 前后端模型命名一致

---

### 6. Prophet 选题 (70% → 80%)

**修复内容**:
- `src/studio/ProphetPanel.jsx`: 增加 `formatKeywords()` 函数适配后端数据格式
- 增加失败时的 fallback mock 数据
- 后端 `prophet.py` 已有完善的 Demo 模式支持

**修复后**:
- 后端返回的 `score` 字段自动转换为前端需要的 `heat`
- 分析失败时显示模拟数据供参考

---

## 📊 功能完善度评估（修复后）

| 模块 | 修复前 | 修复后 | 说明 |
|------|--------|--------|------|
| Prophet 选题 | 70% | 80% | 数据格式适配完成，爬虫待接入 |
| Soul 角色 | 75% | 75% | TTS 可用，声音克隆需公网配置 |
| Arbiter 决策 | 60% | 75% | 数据结构统一，Demo 模式完善 |
| Script 剧本 | 50% | 70% | SSE 完整处理，取消功能可用 |
| Producer 制片 | 55% | 75% | 进度追踪、取消功能完善 |
| 认证系统 | 40% | 80% | Demo/真实 API 双模式可用 |
| 项目管理 | 0% | 70% | 创建/列表 API 对接完成 |

---

## ⚠️ 待解决问题（见下方）

---

# DaraGenius-v4 待解决问题清单

> 本文档记录审查中发现但暂未修复的问题，供后续开发参考。

---

## 一、环境配置问题

### 1. Vite SSL 证书硬编码
**位置**: `vite.config.js:73-76`

```js
https: {
  key: fs.readFileSync(path.resolve(__dirname, '.certs/key.pem')),
  cert: fs.readFileSync(path.resolve(__dirname, '.certs/cert.pem')),
}
```

**问题**: 如果 `.certs/` 目录不存在，Vite dev server 启动会失败。

**建议**: 添加证书存在性检查，或提供无 HTTPS 启动选项。

---

### 2. API Base URL 逻辑混乱
**位置**: `src/services/api.js:11`

```js
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
```

**问题**:
- 开发时 Vite 代理转发 `/api` 到 `127.0.0.1:8000`
- 生产时应使用相对路径 `/api`
- 环境切换可能产生混乱

**建议**: 开发环境统一使用 `/api`，由代理处理。

---

## 二、功能待完善

### 3. 爬虫模块未实际调用
**位置**: `backend/app/crawlers/*.py`

**问题**:
- 爬虫文件存在但路由中未使用
- Prophet 舆情分析直接返回 LLM 生成的模拟数据

**建议**: 后期接入爬虫获取真实平台热点数据。

---

### 4. 导出功能未实现
**位置**: `backend/app/routers/workspace.py:335-359`

```python
# TODO: 生成文件并上传 OSS
return {"message": "导出功能开发中", "download_url": None}
```

**建议**: 实现 DOCX/PDF/Fountain 格式导出，上传至 OSS。

---

### 5. 声音克隆需公网配置
**位置**: `backend/app/routers/soul.py:375-383`

**问题**: DashScope VoiceEnrollmentService 需要公网可访问的音频 URL。

**建议**: 部署时配置 `PUBLIC_HOST` 环境变量，或使用 OSS 存储临时音频。

---

## 三、代码质量优化

### 6. 数据库事务处理不规范
**位置**: `backend/app/routers/soul.py:116-124`

```python
try:
    await db.flush()
except Exception:
    await db.rollback()
# ...
await db.commit()  # rollback 后又 commit
```

**建议**: 使用 `async with db.begin()` 或正确处理 commit/rollback 顺序。

---

### 7. JSON 解析不够健壮

**问题**: 多处使用 `split("```json")[1].split("```")[0]` 解析 LLM 输出。

**建议**: 使用正则表达式更可靠：
```python
import re
match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
if match:
    json_str = match.group(1)
```

---

## 四、后期优化建议

### 8. 添加请求限流
当前 LLM 调用无限制，建议添加：
- API 请求限流 (每分钟 60 次)
- LLM 调用限流 (每分钟 20 次)

### 9. 添加错误边界组件
前端缺少 React Error Boundary，建议添加全局错误捕获。

### 10. 添加日志系统
后端缺少结构化日志，建议使用 `structlog` 或类似库。

---

## 五、测试覆盖

- 单元测试: 0%
- 集成测试: 0%
- E2E 测试: 0%

建议至少为核心 API 添加基本测试。

---

*更新时间: 2026-04-14*