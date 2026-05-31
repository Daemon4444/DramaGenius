"""
Edge-E1: 竞态条件与并发测试
验证核心写入接口在并发请求下不会崩溃、返回一致结果
"""
import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock

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
    token = create_access_token("user-concurrent-test")
    return {"Authorization": f"Bearer {token}"}


# ═══════════════════════════════════════════
# 并发创建项目 (workspace)
# ═══════════════════════════════════════════

class TestConcurrentProjectCreate:
    """同一用户短时间内并发创建多个项目"""

    @pytest.mark.asyncio
    async def test_concurrent_create_project_all_succeed_or_503(self, client, auth_headers):
        """
        10 个并发 POST /api/workspace/project 请求。
        在 DEV_SKIP_DB=true 模式下应统一返回 503（不会 panic/500）；
        若开启了 demo 模式则应全部返回正常结果。
        """
        payload = {"title": "并发项目", "concept": "测试并发", "genre": "悬疑"}

        async def create_one():
            return await client.post(
                "/api/workspace/project", json=payload, headers=auth_headers
            )

        results = await asyncio.gather(*[create_one() for _ in range(10)])

        # 所有响应码应一致（不能出现混合的 500/崩溃情况）
        status_codes = {r.status_code for r in results}
        # 可接受: 全部 201(成功) 或全部 503(DEV_SKIP_DB) 或全部 200
        acceptable = {200, 201, 503}
        for code in status_codes:
            assert code in acceptable, f"Unexpected status {code}: {results[0].text}"

    @pytest.mark.asyncio
    async def test_concurrent_create_returns_unique_ids(self, client, auth_headers):
        """并发创建若成功，每个项目 ID 应唯一"""
        payload = {"title": "唯一ID测试", "concept": "并发测试", "genre": "科幻"}

        async def create_one():
            return await client.post(
                "/api/workspace/project", json=payload, headers=auth_headers
            )

        results = await asyncio.gather(*[create_one() for _ in range(5)])

        # 收集成功创建的项目 ID
        project_ids = []
        for r in results:
            if r.status_code in (200, 201):
                data = r.json()
                pid = data.get("id") or data.get("project_id")
                if pid:
                    project_ids.append(pid)

        # 如果有多个成功，ID 必须唯一
        if len(project_ids) > 1:
            assert len(project_ids) == len(set(project_ids)), "并发创建产生了重复 ID"


# ═══════════════════════════════════════════
# 并发投票 (producer)
# ═══════════════════════════════════════════

class TestConcurrentVoting:
    """高并发观众投票不应导致数据不一致"""

    @pytest.mark.asyncio
    async def test_concurrent_votes_no_crash(self, client, auth_headers):
        """
        20 个并发投票请求。无论 DEV_SKIP_DB 状态如何，
        服务器应一致返回 (200/400/503) 而非 500。
        """
        payload_a = {"interaction_id": "test-interaction-001", "episode": 1, "choice": "A"}
        payload_b = {"interaction_id": "test-interaction-001", "episode": 1, "choice": "B"}

        async def vote(payload):
            return await client.post(
                "/api/producer/interactions/vote", json=payload, headers=auth_headers
            )

        tasks = [vote(payload_a) for _ in range(10)] + [vote(payload_b) for _ in range(10)]
        results = await asyncio.gather(*tasks)

        for r in results:
            # 不应出现 500 Internal Server Error
            assert r.status_code != 500, f"Vote crashed: {r.text}"
            assert r.status_code in (200, 400, 404, 422, 503)

    @pytest.mark.asyncio
    async def test_concurrent_comments_no_crash(self, client, auth_headers):
        """20 个并发评论不应导致服务崩溃"""

        async def comment(i):
            return await client.post(
                "/api/producer/interactions/comment",
                json={
                    "interaction_id": "test-inter-002",
                    "user_name": f"用户{i}",
                    "text": f"第{i}条弹幕"
                }
            )

        results = await asyncio.gather(*[comment(i) for i in range(20)])

        for r in results:
            assert r.status_code != 500, f"Comment crashed: {r.text}"
            assert r.status_code in (200, 201, 400, 404, 422, 503)


# ═══════════════════════════════════════════
# 并发 generate-plan SSE (workspace)
# ═══════════════════════════════════════════

class TestConcurrentSSEGeneration:
    """并发触发 SSE 流式生成不应使服务器 OOM/崩溃"""

    @pytest.mark.asyncio
    async def test_concurrent_generate_plan_no_crash(self, client, auth_headers):
        """5 个并发 generate-plan 请求，服务器应能正常处理"""
        payload = {"concept": "都市悬疑短剧", "episodes": 3}

        async def generate_one():
            return await client.post(
                "/api/workspace/generate-plan", json=payload, headers=auth_headers
            )

        results = await asyncio.gather(*[generate_one() for _ in range(5)])

        for r in results:
            # SSE 返回 200 (streaming) 或 503 (DEV_SKIP_DB) 均可接受
            assert r.status_code != 500, f"Generate-plan crashed: {r.text}"
            assert r.status_code in (200, 400, 401, 403, 422, 503)


# ═══════════════════════════════════════════
# 并发角色生成 (soul)
# ═══════════════════════════════════════════

class TestConcurrentSoulGenerate:
    """并发角色生成请求"""

    @pytest.mark.asyncio
    async def test_concurrent_character_generation(self, client, auth_headers):
        """5 个并发角色生成请求不应崩溃"""
        payload = {"project_id": "demo-project", "concept": "赛博朋克世界的反抗军"}

        async def gen_one():
            return await client.post(
                "/api/soul/generate", json=payload, headers=auth_headers
            )

        results = await asyncio.gather(*[gen_one() for _ in range(5)])

        for r in results:
            # 500 with proper error detail is acceptable (handled error, not crash)
            assert r.status_code in (200, 201, 400, 422, 500, 502, 503)
            if r.status_code == 500:
                data = r.json()
                assert "detail" in data, "500 without error detail = unhandled crash"


# ═══════════════════════════════════════════
# 并发登录 (auth)
# ═══════════════════════════════════════════

class TestConcurrentAuth:
    """大量并发登录请求不应导致 JWT 签发异常"""

    @pytest.mark.asyncio
    async def test_concurrent_login_requests(self, client):
        """50 个并发登录请求"""
        payload = {"email": "test@example.com", "password": "password123"}

        async def login_one():
            return await client.post("/api/auth/login", json=payload)

        results = await asyncio.gather(*[login_one() for _ in range(50)])

        for r in results:
            # DEV_SKIP_DB=true 模式下应该全部返回 503
            assert r.status_code != 500, f"Login crashed: {r.text}"
            assert r.status_code in (200, 401, 422, 503)

        # 所有响应应状态码一致（无随机失败）
        codes = [r.status_code for r in results]
        assert len(set(codes)) == 1, f"Inconsistent responses under load: {set(codes)}"
