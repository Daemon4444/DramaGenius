"""
I12-I14: Prophet 接口集成测试
覆盖: analyze, hot-keywords, platforms
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
# POST /api/prophet/analyze
# ═══════════════════════════════════════════

class TestAnalyzeTrends:
    """舆情分析"""

    @pytest.mark.asyncio
    async def test_analyze_success(self, client, auth_headers):
        """正常分析返回结构化数据"""
        llm_json = json.dumps({
            "keywords": [{"word": "悬疑", "count": 100}],
            "trends": [{"platform": "抖音", "growth": 15}],
            "sentiment": {"positive": 60, "negative": 20, "neutral": 20},
            "suggestions": ["建议1"],
            "hot_topics": ["话题1"]
        })
        
        with patch("app.routers.prophet.search_service") as mock_search:
            mock_search.search_social_data = AsyncMock(return_value="")
            with patch("app.routers.prophet.qwen_service") as mock_qwen:
                mock_qwen.analyze_trends = AsyncMock(return_value=f"```json\n{llm_json}\n```")
                
                response = await client.post("/api/prophet/analyze", json={
                    "query": "都市悬疑短剧",
                    "mode": "realtime"
                }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "keywords" in data
        assert "trends" in data
        assert "sentiment" in data
        assert "suggestions" in data
        assert "hot_topics" in data

    @pytest.mark.asyncio
    async def test_analyze_llm_returns_invalid_json(self, client, auth_headers):
        """LLM 返回非法 JSON -> 502"""
        with patch("app.routers.prophet.search_service") as mock_search:
            mock_search.search_social_data = AsyncMock(return_value="")
            with patch("app.routers.prophet.qwen_service") as mock_qwen:
                mock_qwen.analyze_trends = AsyncMock(return_value="not json at all")
                
                response = await client.post("/api/prophet/analyze", json={
                    "query": "测试",
                    "mode": "realtime"
                }, headers=auth_headers)
        
        assert response.status_code == 502

    @pytest.mark.asyncio
    async def test_analyze_missing_query(self, client, auth_headers):
        """缺少 query -> 422"""
        response = await client.post("/api/prophet/analyze", json={
            "mode": "realtime"
        }, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_analyze_invalid_mode(self, client, auth_headers):
        """无效 mode -> 422"""
        response = await client.post("/api/prophet/analyze", json={
            "query": "test",
            "mode": "invalid_mode"
        }, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_analyze_es_fallback(self, client, auth_headers):
        """ES 不可用时仍能通过 LLM 分析"""
        llm_json = json.dumps({
            "keywords": [], "trends": [], "sentiment": {},
            "suggestions": [], "hot_topics": []
        })
        
        with patch("app.routers.prophet.search_service") as mock_search:
            mock_search.search_social_data = AsyncMock(side_effect=Exception("ES down"))
            with patch("app.routers.prophet.qwen_service") as mock_qwen:
                mock_qwen.analyze_trends = AsyncMock(return_value=llm_json)
                
                response = await client.post("/api/prophet/analyze", json={
                    "query": "test"
                }, headers=auth_headers)
        
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_analyze_with_think_tag(self, client, auth_headers):
        """LLM 返回带 <think> 标签的内容"""
        llm_json = json.dumps({
            "keywords": [], "trends": [], "sentiment": {},
            "suggestions": [], "hot_topics": []
        })
        response_with_think = f"<think>Let me analyze...</think>\n```json\n{llm_json}\n```"
        
        with patch("app.routers.prophet.search_service") as mock_search:
            mock_search.search_social_data = AsyncMock(return_value="")
            with patch("app.routers.prophet.qwen_service") as mock_qwen:
                mock_qwen.analyze_trends = AsyncMock(return_value=response_with_think)
                
                response = await client.post("/api/prophet/analyze", json={
                    "query": "test"
                }, headers=auth_headers)
        
        assert response.status_code == 200


# ═══════════════════════════════════════════
# GET /api/prophet/hot-keywords
# ═══════════════════════════════════════════

class TestHotKeywords:
    """热门关键词"""

    @pytest.mark.asyncio
    async def test_hot_keywords_from_es(self, client):
        """ES 有数据时直接返回"""
        keywords = [{"word": "短剧", "count": 500, "score": 95}]
        
        with patch("app.routers.prophet.search_service") as mock_search:
            mock_search.get_trending_keywords = AsyncMock(return_value=keywords)
            response = await client.get("/api/prophet/hot-keywords")
        
        assert response.status_code == 200
        assert response.json()["keywords"] == keywords

    @pytest.mark.asyncio
    async def test_hot_keywords_llm_fallback(self, client):
        """ES 不可用时 LLM 生成"""
        llm_keywords = json.dumps([{"word": "悬疑", "count": 100, "score": 80}])
        
        with patch("app.routers.prophet.search_service") as mock_search:
            mock_search.get_trending_keywords = AsyncMock(side_effect=Exception("ES down"))
            with patch("app.routers.prophet.qwen_service") as mock_qwen:
                mock_qwen.chat = AsyncMock(return_value=f"```json\n{llm_keywords}\n```")
                response = await client.get("/api/prophet/hot-keywords")
        
        assert response.status_code == 200
        assert len(response.json()["keywords"]) > 0

    @pytest.mark.asyncio
    async def test_hot_keywords_limit_param(self, client):
        """limit 参数"""
        keywords = [{"word": f"kw{i}", "count": i} for i in range(5)]
        
        with patch("app.routers.prophet.search_service") as mock_search:
            mock_search.get_trending_keywords = AsyncMock(return_value=keywords)
            response = await client.get("/api/prophet/hot-keywords?limit=5")
        
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_hot_keywords_both_fail(self, client):
        """ES 和 LLM 都失败 -> 500"""
        with patch("app.routers.prophet.search_service") as mock_search:
            mock_search.get_trending_keywords = AsyncMock(return_value=None)
            with patch("app.routers.prophet.qwen_service") as mock_qwen:
                mock_qwen.chat = AsyncMock(side_effect=RuntimeError("LLM down"))
                response = await client.get("/api/prophet/hot-keywords")
        
        assert response.status_code == 500


# ═══════════════════════════════════════════
# GET /api/prophet/platforms
# ═══════════════════════════════════════════

class TestPlatformStats:
    """平台统计"""

    @pytest.mark.asyncio
    async def test_platforms_from_es(self, client):
        stats = [{"name": "抖音", "posts": 1000}]
        
        with patch("app.routers.prophet.search_service") as mock_search:
            mock_search.get_platform_stats = AsyncMock(return_value=stats)
            response = await client.get("/api/prophet/platforms")
        
        assert response.status_code == 200
        assert response.json()["platforms"] == stats

    @pytest.mark.asyncio
    async def test_platforms_fallback(self, client):
        """ES 不可用时返回默认平台列表"""
        with patch("app.routers.prophet.search_service") as mock_search:
            mock_search.get_platform_stats = AsyncMock(side_effect=Exception("ES down"))
            response = await client.get("/api/prophet/platforms")
        
        assert response.status_code == 200
        platforms = response.json()["platforms"]
        assert len(platforms) == 4
        names = [p["name"] for p in platforms]
        assert "抖音" in names
        assert "微博" in names
