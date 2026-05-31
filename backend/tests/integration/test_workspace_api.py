"""
I5-I11: Workspace 接口集成测试
覆盖: project CRUD, generate-plan, continue, export
在 DEV_SKIP_DB=true 模式下测试
"""
import os
import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.utils.auth import create_access_token


# ═══════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def auth_headers():
    token = create_access_token("test-user-123")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def demo_auth_headers():
    """Demo 用户的 token"""
    token = create_access_token("00000000-0000-0000-0000-000000000001")
    return {"Authorization": f"Bearer {token}"}


# ═══════════════════════════════════════════
# POST /api/workspace/project (创建项目)
# ═══════════════════════════════════════════

class TestCreateProject:
    """项目创建"""

    @pytest.mark.asyncio
    async def test_create_returns_503_in_dev_mode(self, client, auth_headers):
        """DEV_SKIP_DB=true + ALLOW_DEMO_DATA=false -> 503"""
        response = await client.post("/api/workspace/project", json={
            "title": "测试项目",
            "concept": "都市悬疑",
            "genre": "悬疑"
        }, headers=auth_headers)
        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_create_missing_title(self, client, auth_headers):
        """缺少 title 字段 -> 422"""
        response = await client.post("/api/workspace/project", json={
            "concept": "概念"
        }, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_missing_concept(self, client, auth_headers):
        """缺少 concept 字段 -> 422"""
        response = await client.post("/api/workspace/project", json={
            "title": "标题"
        }, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_empty_body(self, client, auth_headers):
        response = await client.post("/api/workspace/project", json={}, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_no_auth_uses_demo_user(self, client):
        """无 auth -> 使用 demo 用户 (optional auth)"""
        response = await client.post("/api/workspace/project", json={
            "title": "测试",
            "concept": "概念"
        })
        # 仍然返回 503 因为 DEV_SKIP_DB=true & ALLOW_DEMO_DATA=false
        assert response.status_code == 503


# ═══════════════════════════════════════════
# GET /api/workspace/projects (列出项目)
# ═══════════════════════════════════════════

class TestListProjects:
    """项目列表"""

    @pytest.mark.asyncio
    async def test_list_returns_503_in_dev_mode(self, client, auth_headers):
        response = await client.get("/api/workspace/projects", headers=auth_headers)
        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_list_no_auth(self, client):
        """无 auth 也返回 503"""
        response = await client.get("/api/workspace/projects")
        assert response.status_code == 503


# ═══════════════════════════════════════════
# GET /api/workspace/project/{id} (获取项目)
# ═══════════════════════════════════════════

class TestGetProject:
    """获取项目详情"""

    @pytest.mark.asyncio
    async def test_get_returns_503_in_dev_mode(self, client, auth_headers):
        response = await client.get("/api/workspace/project/proj-fuhua", headers=auth_headers)
        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_get_alternative_path(self, client, auth_headers):
        """alternative /projects/{id} 路径"""
        response = await client.get("/api/workspace/projects/proj-fuhua", headers=auth_headers)
        assert response.status_code == 503


# ═══════════════════════════════════════════
# DELETE /api/workspace/project/{id}
# ═══════════════════════════════════════════

class TestDeleteProject:
    """删除项目"""

    @pytest.mark.asyncio
    async def test_delete_returns_503_in_dev_mode(self, client, auth_headers):
        response = await client.delete("/api/workspace/project/some-id", headers=auth_headers)
        assert response.status_code == 503


# ═══════════════════════════════════════════
# POST /api/workspace/generate-plan (SSE 流式方案生成)
# ═══════════════════════════════════════════

class TestGeneratePlan:
    """方案生成 (SSE 流)"""

    @pytest.mark.asyncio
    async def test_generate_plan_streams_sse(self, client, auth_headers):
        """Mock LLM 验证 SSE 流输出正确"""
        mock_llm_response = '```json\n{"keywords": [{"word": "悬疑"}], "characters": [{"name": "主角", "role": "protagonist"}], "decisions": [{"scene": "转折"}], "monetization": {}, "episodes": [{"title": "第1集"}]}\n```'
        
        with patch("app.routers.workspace.qwen_service") as mock_qwen:
            mock_qwen.analyze_trends = AsyncMock(return_value=mock_llm_response)
            mock_qwen.generate_characters = AsyncMock(return_value=mock_llm_response)
            mock_qwen.design_decisions = AsyncMock(return_value=mock_llm_response)
            mock_qwen.generate_outline = AsyncMock(return_value=mock_llm_response)
            
            response = await client.post("/api/workspace/generate-plan", json={
                "concept": "都市悬疑短剧",
                "genre": "悬疑",
                "episodes": 6,
            }, headers=auth_headers)
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
        
        # 验证 SSE 内容
        body = response.text
        assert "stage_start" in body
        assert "prophet" in body
        assert "soul" in body
        assert "arbiter" in body
        assert "outline" in body
        assert "all_complete" in body

    @pytest.mark.asyncio
    async def test_generate_plan_missing_concept(self, client, auth_headers):
        """缺少 concept -> 422"""
        response = await client.post("/api/workspace/generate-plan", json={}, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_generate_plan_no_auth_still_works(self, client):
        """无 auth 使用 optional auth (demo 用户)，仍可调用"""
        mock_response = '```json\n{"keywords": [], "characters": [], "decisions": [], "episodes": []}\n```'
        
        with patch("app.routers.workspace.qwen_service") as mock_qwen:
            mock_qwen.analyze_trends = AsyncMock(return_value=mock_response)
            mock_qwen.generate_characters = AsyncMock(return_value=mock_response)
            mock_qwen.design_decisions = AsyncMock(return_value=mock_response)
            mock_qwen.generate_outline = AsyncMock(return_value=mock_response)
            
            response = await client.post("/api/workspace/generate-plan", json={
                "concept": "科幻"
            })
        
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_generate_plan_llm_error_sends_error_event(self, client, auth_headers):
        """LLM 异常应通过 SSE error 事件通知"""
        with patch("app.routers.workspace.qwen_service") as mock_qwen:
            mock_qwen.analyze_trends = AsyncMock(side_effect=RuntimeError("LLM unavailable"))
            
            response = await client.post("/api/workspace/generate-plan", json={
                "concept": "测试"
            }, headers=auth_headers)
        
        assert response.status_code == 200  # SSE 总是 200
        body = response.text
        assert "error" in body
        assert "LLM unavailable" in body


# ═══════════════════════════════════════════
# POST /api/workspace/continue (剧本续写)
# ═══════════════════════════════════════════

class TestContinueScript:
    """剧本续写"""

    @pytest.mark.asyncio
    async def test_continue_returns_503_dev_mode(self, client, auth_headers):
        """DEV_SKIP_DB=true + ALLOW_DEMO_DATA=false -> 503"""
        response = await client.post("/api/workspace/continue", json={
            "project_id": "proj-1",
            "episode_number": 1,
            "mood": "紧张"
        }, headers=auth_headers)
        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_continue_missing_project_id(self, client, auth_headers):
        """缺少 project_id -> 422"""
        response = await client.post("/api/workspace/continue", json={
            "episode_number": 1
        }, headers=auth_headers)
        assert response.status_code == 422


# ═══════════════════════════════════════════
# POST /api/workspace/episodes/{id}/scenes (保存场景)
# ═══════════════════════════════════════════

class TestSaveScene:
    """场景保存"""

    @pytest.mark.asyncio
    async def test_save_scene_empty_content(self, client, auth_headers):
        """空内容 -> 400"""
        response = await client.post("/api/workspace/episodes/ep-1/scenes", json={
            "content": "   ",
            "scene_type": "narration"
        }, headers=auth_headers)
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_save_scene_missing_content(self, client, auth_headers):
        """缺少 content -> 422"""
        response = await client.post("/api/workspace/episodes/ep-1/scenes", json={
            "scene_type": "narration"
        }, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_save_scene_503_dev_mode(self, client, auth_headers):
        """有内容但 DEV_SKIP_DB -> 503"""
        response = await client.post("/api/workspace/episodes/ep-1/scenes", json={
            "content": "一段有效的场景内容",
            "scene_type": "dialogue",
            "character_name": "角色A"
        }, headers=auth_headers)
        assert response.status_code == 503


# ═══════════════════════════════════════════
# POST /api/workspace/export (导出)
# ═══════════════════════════════════════════

class TestExportProject:
    """项目导出"""

    @pytest.mark.asyncio
    async def test_export_returns_503_dev_mode(self, client, auth_headers):
        response = await client.post("/api/workspace/export", json={
            "project_id": "proj-fuhua",
            "format": "json"
        }, headers=auth_headers)
        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_export_invalid_format(self, client, auth_headers):
        """不支持的格式 -> 400"""
        response = await client.post("/api/workspace/export", json={
            "project_id": "proj-fuhua",
            "format": "mp4"
        }, headers=auth_headers)
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_export_missing_project_id(self, client, auth_headers):
        response = await client.post("/api/workspace/export", json={
            "format": "json"
        }, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_export_format_aliases(self, client, auth_headers):
        """fdx 别名应转换为 fountain 但仍 503"""
        response = await client.post("/api/workspace/export", json={
            "project_id": "proj-fuhua",
            "format": "fdx"
        }, headers=auth_headers)
        # fdx 是 fountain 别名，格式合法，但 DEV_SKIP_DB -> 503
        assert response.status_code == 503


# ═══════════════════════════════════════════
# Health check (bonus)
# ═══════════════════════════════════════════

class TestHealthEndpoints:
    """健康检查"""

    @pytest.mark.asyncio
    async def test_health(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "app" in data

    @pytest.mark.asyncio
    async def test_ready(self, client):
        response = await client.get("/ready")
        # DEV_SKIP_DB 下仍应返回 200 (但部分服务显示 skip)
        assert response.status_code == 200
