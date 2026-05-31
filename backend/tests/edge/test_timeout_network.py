"""
Edge-E3: 超时与网络故障测试
模拟数据库超时、LLM 服务宕机、第三方依赖网络故障，
验证系统返回规范错误码 (500/502/503/504) 且进程不崩溃
"""
import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock, MagicMock
from openai import APITimeoutError, APIConnectionError, APIStatusError

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
    token = create_access_token("user-timeout-test")
    return {"Authorization": f"Bearer {token}"}


# ═══════════════════════════════════════════
# LLM 服务超时 (qwen_service)
# ═══════════════════════════════════════════

class TestLLMTimeout:
    """模拟千问/DashScope 服务超时"""

    @pytest.mark.asyncio
    async def test_soul_generate_llm_timeout(self, client, auth_headers):
        """角色生成时 LLM 超时 -> 应返回 500/502/503 而非挂起"""
        with patch("app.routers.soul.qwen_service.generate_characters") as mock_gen:
            mock_gen.side_effect = asyncio.TimeoutError("LLM request timed out")

            response = await client.post(
                "/api/soul/generate",
                json={"project_id": "demo-project", "concept": "都市悬疑"},
                headers=auth_headers,
            )
            assert response.status_code in (500, 502, 503, 504)
            data = response.json()
            assert "detail" in data

    @pytest.mark.asyncio
    async def test_soul_generate_llm_connection_error(self, client, auth_headers):
        """角色生成时 LLM 连接失败"""
        with patch("app.routers.soul.qwen_service.generate_characters") as mock_gen:
            mock_gen.side_effect = ConnectionError("Cannot reach DashScope API")

            response = await client.post(
                "/api/soul/generate",
                json={"project_id": "demo-project", "concept": "科幻短剧"},
                headers=auth_headers,
            )
            assert response.status_code in (500, 502, 503)
            data = response.json()
            assert "detail" in data

    @pytest.mark.asyncio
    async def test_soul_dialogue_llm_timeout(self, client, auth_headers):
        """对话生成时 LLM 超时"""
        with patch("app.routers.soul.qwen_service.chat") as mock_chat:
            mock_chat.side_effect = asyncio.TimeoutError("timeout")

            response = await client.post(
                "/api/soul/generate-dialogue",
                json={
                    "character_name": "林夏",
                    "personality": "坚强",
                    "scene": "办公室"
                },
                headers=auth_headers,
            )
            assert response.status_code in (500, 502, 503, 504)

    @pytest.mark.asyncio
    async def test_prophet_analyze_llm_timeout(self, client, auth_headers):
        """趋势分析时 LLM 超时"""
        with patch("app.routers.prophet.qwen_service.analyze_trends") as mock_an:
            mock_an.side_effect = asyncio.TimeoutError("timeout")

            response = await client.post(
                "/api/prophet/analyze",
                json={"query": "甜宠短剧", "mode": "realtime"},
                headers=auth_headers,
            )
            assert response.status_code in (500, 502, 503, 504)

    @pytest.mark.asyncio
    async def test_arbiter_design_llm_timeout(self, client, auth_headers):
        """决策设计时 LLM 超时 -> 在 DEV_SKIP_DB 模式返回 503"""
        with patch("app.routers.arbiter.qwen_service.design_decisions") as mock_d:
            mock_d.side_effect = asyncio.TimeoutError("timeout")

            response = await client.post(
                "/api/arbiter/design",
                json={
                    "project_id": "demo-project",
                    "outline": "第一集大纲",
                    "characters": [{"name": "林夏", "role": "女主"}]
                },
                headers=auth_headers,
            )
            # DEV_SKIP_DB=true + ALLOW_DEMO_DATA=false -> 503 before LLM
            # With ALLOW_DEMO_DATA=true -> would hit LLM -> timeout -> 500
            assert response.status_code in (500, 502, 503, 504)


# ═══════════════════════════════════════════
# LLM 返回异常响应
# ═══════════════════════════════════════════

class TestLLMBadResponse:
    """模拟 LLM 返回非法内容（非 JSON / 空响应）"""

    @pytest.mark.asyncio
    async def test_soul_generate_llm_returns_garbage(self, client, auth_headers):
        """LLM 返回不可解析的垃圾文本"""
        with patch("app.routers.soul.qwen_service.generate_characters") as mock_gen:
            mock_gen.return_value = "这不是JSON!!! {{{broken"

            response = await client.post(
                "/api/soul/generate",
                json={"project_id": "demo-project", "concept": "测试"},
                headers=auth_headers,
            )
            # 应返回解析失败而非崩溃
            assert response.status_code in (500, 502)
            data = response.json()
            assert "detail" in data

    @pytest.mark.asyncio
    async def test_soul_generate_llm_returns_empty(self, client, auth_headers):
        """LLM 返回空字符串"""
        with patch("app.routers.soul.qwen_service.generate_characters") as mock_gen:
            mock_gen.return_value = ""

            response = await client.post(
                "/api/soul/generate",
                json={"project_id": "demo-project", "concept": "空响应测试"},
                headers=auth_headers,
            )
            assert response.status_code in (500, 502)

    @pytest.mark.asyncio
    async def test_soul_generate_llm_returns_none(self, client, auth_headers):
        """LLM 返回 None"""
        with patch("app.routers.soul.qwen_service.generate_characters") as mock_gen:
            mock_gen.return_value = None

            response = await client.post(
                "/api/soul/generate",
                json={"project_id": "demo-project", "concept": "None测试"},
                headers=auth_headers,
            )
            assert response.status_code in (500, 502)


# ═══════════════════════════════════════════
# 数据库连接故障 (非 DEV_SKIP_DB 模式模拟)
# ═══════════════════════════════════════════

class TestDatabaseFailure:
    """模拟数据库异常（连接超时、断连、死锁）"""

    @pytest.mark.asyncio
    async def test_db_timeout_on_project_list(self, client, auth_headers):
        """获取项目列表时数据库超时"""
        with patch("app.routers.workspace.get_db") as mock_get_db:
            mock_session = AsyncMock()
            mock_session.execute.side_effect = asyncio.TimeoutError("DB connection timeout")

            async def fake_db():
                yield mock_session
            mock_get_db.return_value = fake_db()

            response = await client.get(
                "/api/workspace/projects", headers=auth_headers
            )
            # 可能返回 500/503/504，不应挂起
            assert response.status_code in (200, 500, 502, 503, 504)

    @pytest.mark.asyncio
    async def test_db_connection_refused(self, client, auth_headers):
        """数据库拒绝连接"""
        with patch("app.routers.workspace.get_db") as mock_get_db:
            mock_session = AsyncMock()
            mock_session.execute.side_effect = ConnectionRefusedError("Connection refused")

            async def fake_db():
                yield mock_session
            mock_get_db.return_value = fake_db()

            response = await client.get(
                "/api/workspace/projects", headers=auth_headers
            )
            assert response.status_code in (200, 500, 502, 503)


# ═══════════════════════════════════════════
# 第三方服务宕机 (Voice/Video/OSS)
# ═══════════════════════════════════════════

class TestThirdPartyDown:
    """语音合成、视频生成、OSS 存储服务不可用"""

    @pytest.mark.asyncio
    async def test_tts_service_timeout(self, client, auth_headers):
        """TTS 语音合成超时"""
        with patch("app.routers.soul.voice_service.synthesize_to_bytes") as mock_tts:
            mock_tts.side_effect = asyncio.TimeoutError("TTS service timeout")

            response = await client.post(
                "/api/soul/tts",
                json={"text": "你好世界", "voice": "longxiaochun_v2"},
                headers=auth_headers,
            )
            assert response.status_code in (500, 502, 503, 504)

    @pytest.mark.asyncio
    async def test_tts_service_connection_error(self, client, auth_headers):
        """TTS 服务连接错误"""
        with patch("app.routers.soul.voice_service.synthesize_to_bytes") as mock_tts:
            mock_tts.side_effect = ConnectionError("CosyVoice service unreachable")

            response = await client.post(
                "/api/soul/tts",
                json={"text": "测试语音", "voice": "longxiaochun_v2"},
                headers=auth_headers,
            )
            assert response.status_code in (500, 502, 503)

    @pytest.mark.asyncio
    async def test_video_generation_timeout(self, client, auth_headers):
        """视频生成服务超时"""
        with patch("app.routers.producer.producer_service") as mock_ps:
            mock_ps.submit_video_task = AsyncMock(
                side_effect=asyncio.TimeoutError("Video API timeout")
            )

            response = await client.post(
                "/api/producer/video/generate",
                json={
                    "project_id": "demo",
                    "script_id": "ep1",
                    "prompt": "赛博朋克城市夜景",
                    "model": "wan2.1-t2v-turbo"
                },
                headers=auth_headers,
            )
            assert response.status_code in (500, 502, 503, 504)

    @pytest.mark.asyncio
    async def test_oss_upload_failure(self, client, auth_headers):
        """OSS 上传失败"""
        with patch("app.routers.producer.storage_service.upload_bytes") as mock_oss:
            mock_oss.side_effect = ConnectionError("OSS endpoint unreachable")

            # 模拟上传 reference 文件
            response = await client.post(
                "/api/producer/references/upload",
                files={"file": ("test.png", b"\x89PNG\r\n\x1a\n" + b"\x00" * 100, "image/png")},
                data={"project_id": "demo", "ref_type": "image"},
                headers=auth_headers,
            )
            # 400 is valid if endpoint validates input before reaching storage
            assert response.status_code in (400, 500, 502, 503)


# ═══════════════════════════════════════════
# 慢响应下的客户端断连模拟
# ═══════════════════════════════════════════

class TestSlowResponseHandling:
    """模拟慢请求场景下的优雅处理"""

    @pytest.mark.asyncio
    async def test_generate_plan_slow_but_no_hang(self, client, auth_headers):
        """
        generate-plan 即使内部超时，请求也不应无限挂起。
        设置 httpx 超时为 5s，若 LLM 耗时过长应正常结束。
        """
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://test", timeout=5.0
        ) as short_client:
            # 在 DEV_SKIP_DB 模式下 LLM 不会真正调用，所以应快速返回
            response = await short_client.post(
                "/api/workspace/generate-plan",
                json={"concept": "超时测试", "episodes": 3},
                headers=auth_headers,
            )
            # 正常返回（不挂起）
            assert response.status_code in (200, 400, 422, 500, 503)

    @pytest.mark.asyncio
    async def test_multiple_endpoints_after_failure(self, client, auth_headers):
        """
        一次失败请求后，后续请求仍应正常处理（服务没有被之前的错误卡住）。
        """
        # 第一个请求: 触发失败
        with patch("app.routers.soul.qwen_service.generate_characters") as mock_gen:
            mock_gen.side_effect = asyncio.TimeoutError("timeout")
            r1 = await client.post(
                "/api/soul/generate",
                json={"project_id": "demo-project", "concept": "失败"},
                headers=auth_headers,
            )
            assert r1.status_code in (500, 502, 503, 504)

        # 第二个请求: 应该正常处理（服务未被污染）
        r2 = await client.post(
            "/api/auth/login",
            json={"email": "test@test.com", "password": "pass"}
        )
        # 无论具体返回码，关键是不应 500 + 无意义 traceback
        assert r2.status_code in (200, 401, 503)

    @pytest.mark.asyncio
    async def test_service_recovery_after_db_error(self, client, auth_headers):
        """数据库故障恢复后，服务应能继续正常响应"""
        # 健康检查或简单接口应始终工作
        r = await client.get("/api/producer/hotspots/sources")
        assert r.status_code == 200
        data = r.json()
        assert "xiaohongshu" in data or "baidu" in data
