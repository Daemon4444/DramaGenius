"""
I20-I23: Arbiter 接口集成测试
覆盖: simulate-stream, generate-scenario, design, simulate, project decisions
"""
import json
import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.utils.auth import create_access_token


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def auth_headers():
    token = create_access_token("test-user-123")
    return {"Authorization": f"Bearer {token}"}


# ═══════════════════════════════════════════
# POST /api/arbiter/simulate-stream (免登录 Demo)
# ═══════════════════════════════════════════

class TestSimulateStreamFree:
    """免登录决策流式模拟"""

    @pytest.mark.asyncio
    async def test_simulate_stream_success(self, client):
        """正常 SSE 流"""
        async def mock_gen():
            yield "剧情转折："
            yield "角色做出了选择..."

        with patch("app.routers.arbiter.qwen_service") as mock_qwen:
            mock_qwen.simulate_decision = lambda *a, **kw: mock_gen()
            response = await client.post("/api/arbiter/simulate-stream", json={
                "scene": "暗夜追踪",
                "question": "是否追入小巷？",
                "choice": "A",
                "choice_description": "勇敢追入"
            })
        
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        body = response.text
        assert "剧情转折" in body
        assert "event: done" in body

    @pytest.mark.asyncio
    async def test_simulate_stream_missing_fields(self, client):
        """缺少必填字段 -> 422"""
        response = await client.post("/api/arbiter/simulate-stream", json={
            "scene": "test"
        })
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_simulate_stream_no_auth_required(self, client):
        """不需要认证"""
        async def mock_gen():
            yield "ok"

        with patch("app.routers.arbiter.qwen_service") as mock_qwen:
            mock_qwen.simulate_decision = lambda *a, **kw: mock_gen()
            response = await client.post("/api/arbiter/simulate-stream", json={
                "scene": "s",
                "question": "q",
                "choice": "A"
            })
        
        assert response.status_code == 200


# ═══════════════════════════════════════════
# POST /api/arbiter/generate-scenario
# ═══════════════════════════════════════════

class TestGenerateScenario:
    """生成决策场景"""

    @pytest.mark.asyncio
    async def test_generate_scenario_success(self, client):
        """正常生成"""
        llm_data = json.dumps({
            "decisions": [{
                "id": "d1",
                "scene": "商场对峙",
                "question": "如何回应？",
                "choices": [
                    {"id": "A", "label": "反击", "description": "正面回击", "impact": "冲突升级",
                     "metrics": {"drama": 90, "satisfaction": 60}},
                    {"id": "B", "label": "隐忍", "description": "暂时退让", "impact": "伏笔铺垫",
                     "metrics": {"drama": 50, "satisfaction": 80}},
                ]
            }]
        })
        
        with patch("app.routers.arbiter.qwen_service") as mock_qwen:
            mock_qwen.chat = AsyncMock(return_value=f"```json\n{llm_data}\n```")
            response = await client.post("/api/arbiter/generate-scenario", json={
                "concept": "都市复仇"
            })
        
        assert response.status_code == 200
        data = response.json()
        assert "decisions" in data
        assert len(data["decisions"]) == 1
        assert len(data["decisions"][0]["choices"]) == 2

    @pytest.mark.asyncio
    async def test_generate_scenario_missing_concept(self, client):
        """缺少 concept -> 422"""
        response = await client.post("/api/arbiter/generate-scenario", json={})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_generate_scenario_llm_invalid_json(self, client):
        """LLM 返回非法 JSON -> 502"""
        with patch("app.routers.arbiter.qwen_service") as mock_qwen:
            mock_qwen.chat = AsyncMock(return_value="invalid")
            response = await client.post("/api/arbiter/generate-scenario", json={
                "concept": "test"
            })
        
        assert response.status_code == 502

    @pytest.mark.asyncio
    async def test_generate_scenario_fills_defaults(self, client):
        """缺少字段时自动填充默认值"""
        llm_data = json.dumps({
            "decisions": [{"choices": [{}]}]
        })
        
        with patch("app.routers.arbiter.qwen_service") as mock_qwen:
            mock_qwen.chat = AsyncMock(return_value=llm_data)
            response = await client.post("/api/arbiter/generate-scenario", json={
                "concept": "test"
            })
        
        assert response.status_code == 200
        data = response.json()
        dec = data["decisions"][0]
        assert dec["id"] == "d1"
        assert dec["scene"] == ""
        choice = dec["choices"][0]
        assert choice["id"] == "A"
        assert choice["label"] == "选项1"


# ═══════════════════════════════════════════
# POST /api/arbiter/design (需要认证)
# ═══════════════════════════════════════════

class TestDesignDecisions:
    """决策点设计"""

    @pytest.mark.asyncio
    async def test_design_503_dev_mode(self, client, auth_headers):
        """DEV_SKIP_DB + ALLOW_DEMO_DATA=false -> 503"""
        response = await client.post("/api/arbiter/design", json={
            "project_id": "proj-1",
            "outline": "大纲内容"
        }, headers=auth_headers)
        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_design_no_auth_401(self, client):
        """需要认证"""
        response = await client.post("/api/arbiter/design", json={
            "project_id": "proj-1",
            "outline": "大纲"
        })
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_design_missing_fields(self, client, auth_headers):
        """缺少字段 -> 422"""
        response = await client.post("/api/arbiter/design", json={
            "outline": "大纲"
        }, headers=auth_headers)
        assert response.status_code == 422


# ═══════════════════════════════════════════
# POST /api/arbiter/simulate (需要认证)
# ═══════════════════════════════════════════

class TestSimulateDecision:
    """决策模拟"""

    @pytest.mark.asyncio
    async def test_simulate_503_dev_mode(self, client, auth_headers):
        """DEV_SKIP_DB + ALLOW_DEMO_DATA=false -> 503"""
        response = await client.post("/api/arbiter/simulate", json={
            "decision_id": "dec-1",
            "choice": "A"
        }, headers=auth_headers)
        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_simulate_no_auth_401(self, client):
        response = await client.post("/api/arbiter/simulate", json={
            "decision_id": "dec-1",
            "choice": "A"
        })
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_simulate_missing_fields(self, client, auth_headers):
        response = await client.post("/api/arbiter/simulate", json={}, headers=auth_headers)
        assert response.status_code == 422


# ═══════════════════════════════════════════
# GET /api/arbiter/project/{project_id}
# ═══════════════════════════════════════════

class TestGetProjectDecisions:
    """获取项目决策点"""

    @pytest.mark.asyncio
    async def test_get_decisions_503_dev_mode(self, client, auth_headers):
        response = await client.get("/api/arbiter/project/proj-1", headers=auth_headers)
        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_get_decisions_no_auth_401(self, client):
        response = await client.get("/api/arbiter/project/proj-1")
        assert response.status_code == 401
