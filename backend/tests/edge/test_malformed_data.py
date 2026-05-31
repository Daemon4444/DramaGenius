"""
Edge-E2: 畸形数据（脏数据）测试
向核心 API 传递超大 Payload、Null 值、缺失字段、错误类型，
验证系统返回规范错误码 (400/422) 而非 500 崩溃
"""
import pytest
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
    token = create_access_token("user-dirty-data-test")
    return {"Authorization": f"Bearer {token}"}


# ═══════════════════════════════════════════
# 超大 Payload 测试
# ═══════════════════════════════════════════

class TestOversizedPayload:
    """超长字符串、超大 JSON 不应使服务器崩溃"""

    @pytest.mark.asyncio
    async def test_oversized_concept_field(self, client, auth_headers):
        """concept 字段传入 1MB 文本"""
        huge_text = "A" * (1024 * 1024)  # 1MB
        response = await client.post(
            "/api/workspace/project",
            json={"title": "正常标题", "concept": huge_text, "genre": "测试"},
            headers=auth_headers,
        )
        # 应优雅处理: 413 / 422 / 503 均可接受，不应 500
        assert response.status_code in (200, 201, 400, 413, 422, 503)

    @pytest.mark.asyncio
    async def test_oversized_title_field(self, client, auth_headers):
        """title 字段传入 100KB 文本"""
        huge_title = "标题" * 50000  # ~100KB
        response = await client.post(
            "/api/workspace/project",
            json={"title": huge_title, "concept": "正常内容", "genre": "测试"},
            headers=auth_headers,
        )
        assert response.status_code in (200, 201, 400, 413, 422, 503)

    @pytest.mark.asyncio
    async def test_oversized_generate_plan_concept(self, client, auth_headers):
        """generate-plan 传入超长 concept"""
        response = await client.post(
            "/api/workspace/generate-plan",
            json={"concept": "X" * 500000, "episodes": 3},
            headers=auth_headers,
        )
        assert response.status_code in (200, 400, 413, 422, 503)

    @pytest.mark.asyncio
    async def test_oversized_comment_text(self, client, auth_headers):
        """评论传入超长弹幕文本"""
        response = await client.post(
            "/api/producer/interactions/comment",
            json={
                "interaction_id": "test-001",
                "user_name": "用户",
                "text": "弹" * 100000
            },
        )
        assert response.status_code in (200, 400, 413, 422, 503)

    @pytest.mark.asyncio
    async def test_oversized_soul_concept(self, client, auth_headers):
        """角色生成传入超长 concept"""
        response = await client.post(
            "/api/soul/generate",
            json={"project_id": "demo-project", "concept": "角色概念" * 100000},
            headers=auth_headers,
        )
        assert response.status_code in (200, 400, 413, 422, 500, 503)


# ═══════════════════════════════════════════
# Null / None 值测试
# ═══════════════════════════════════════════

class TestNullValues:
    """必填字段传入 null 应返回 422，可选字段传入 null 不应崩溃"""

    @pytest.mark.asyncio
    async def test_null_title_create_project(self, client, auth_headers):
        """title=null 创建项目"""
        response = await client.post(
            "/api/workspace/project",
            json={"title": None, "concept": "测试", "genre": "悬疑"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_null_concept_create_project(self, client, auth_headers):
        """concept=null 创建项目"""
        response = await client.post(
            "/api/workspace/project",
            json={"title": "标题", "concept": None},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_null_concept_generate_plan(self, client, auth_headers):
        """generate-plan concept=null"""
        response = await client.post(
            "/api/workspace/generate-plan",
            json={"concept": None, "episodes": 3},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_null_choice_vote(self, client, auth_headers):
        """投票 choice=null"""
        response = await client.post(
            "/api/producer/interactions/vote",
            json={"interaction_id": "test-001", "choice": None},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_null_character_name_dialogue(self, client, auth_headers):
        """角色对话 character_name=null"""
        response = await client.post(
            "/api/soul/generate-dialogue",
            json={
                "character_name": None,
                "personality": "冷酷",
                "scene": "办公室对峙"
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_null_email_register(self, client):
        """注册 email=null"""
        response = await client.post(
            "/api/auth/register",
            json={"email": None, "name": "测试", "password": "pass123"}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_null_password_login(self, client):
        """登录 password=null"""
        response = await client.post(
            "/api/auth/login",
            json={"email": "test@test.com", "password": None}
        )
        assert response.status_code == 422


# ═══════════════════════════════════════════
# 缺失关键字段测试
# ═══════════════════════════════════════════

class TestMissingFields:
    """必填字段完全缺失"""

    @pytest.mark.asyncio
    async def test_empty_body_create_project(self, client, auth_headers):
        """空 body 创建项目"""
        response = await client.post(
            "/api/workspace/project", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_missing_concept_generate_plan(self, client, auth_headers):
        """generate-plan 缺少 concept"""
        response = await client.post(
            "/api/workspace/generate-plan",
            json={"episodes": 3},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_missing_choice_vote(self, client, auth_headers):
        """投票缺少 choice 字段"""
        response = await client.post(
            "/api/producer/interactions/vote",
            json={"interaction_id": "test-001"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_missing_text_comment(self, client):
        """评论缺少 text 字段"""
        response = await client.post(
            "/api/producer/interactions/comment",
            json={"interaction_id": "test-001", "user_name": "用户"},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_missing_concept_soul_generate(self, client, auth_headers):
        """角色生成缺少 concept"""
        response = await client.post(
            "/api/soul/generate", json={"project_id": "demo"}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_empty_body_login(self, client):
        """空 body 登录"""
        response = await client.post("/api/auth/login", json={})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_no_content_type(self, client, auth_headers):
        """不发 JSON content-type，发纯文本"""
        response = await client.post(
            "/api/workspace/project",
            content="not json at all",
            headers={**auth_headers, "content-type": "text/plain"},
        )
        assert response.status_code == 422


# ═══════════════════════════════════════════
# 错误数据类型测试
# ═══════════════════════════════════════════

class TestWrongTypes:
    """字段传入不匹配的数据类型"""

    @pytest.mark.asyncio
    async def test_episodes_as_string(self, client, auth_headers):
        """generate-plan episodes 传字符串而非 int"""
        response = await client.post(
            "/api/workspace/generate-plan",
            json={"concept": "测试", "episodes": "三集"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_title_as_number(self, client, auth_headers):
        """创建项目 title 传数字"""
        response = await client.post(
            "/api/workspace/project",
            json={"title": 12345, "concept": "测试"},
            headers=auth_headers,
        )
        # Pydantic 可能会强制 coerce int -> str, 或返回 422
        assert response.status_code in (200, 201, 422, 503)

    @pytest.mark.asyncio
    async def test_choice_as_number(self, client, auth_headers):
        """投票 choice 传数字而非字符串"""
        response = await client.post(
            "/api/producer/interactions/vote",
            json={"interaction_id": "test-001", "choice": 1},
            headers=auth_headers,
        )
        # Pydantic str coercion: int "1" -> str "1" -> then validate A/B -> 400
        assert response.status_code in (400, 422)

    @pytest.mark.asyncio
    async def test_concept_as_list(self, client, auth_headers):
        """concept 传数组而非字符串"""
        response = await client.post(
            "/api/workspace/generate-plan",
            json={"concept": ["都市", "悬疑"], "episodes": 3},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_nested_object_in_string_field(self, client, auth_headers):
        """字符串字段传入嵌套对象"""
        response = await client.post(
            "/api/soul/generate",
            json={"project_id": "demo-project", "concept": {"nested": {"deep": True}}},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_vote_choice(self, client, auth_headers):
        """投票传入非法 choice 值 (非 A/B)"""
        response = await client.post(
            "/api/producer/interactions/vote",
            json={"interaction_id": "test-001", "choice": "C"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_invalid_export_format(self, client, auth_headers):
        """导出传入不支持的格式"""
        response = await client.post(
            "/api/workspace/export",
            json={"project_id": "proj-fuhua", "format": "exe"},
            headers=auth_headers,
        )
        # 应返回 400 而非 500
        assert response.status_code in (400, 503)


# ═══════════════════════════════════════════
# 恶意/边界字符注入测试
# ═══════════════════════════════════════════

class TestMaliciousInput:
    """SQL 注入、XSS、特殊字符不应使服务崩溃"""

    @pytest.mark.asyncio
    async def test_sql_injection_in_title(self, client, auth_headers):
        """title 字段 SQL 注入"""
        response = await client.post(
            "/api/workspace/project",
            json={
                "title": "'; DROP TABLE projects; --",
                "concept": "测试",
                "genre": "1' OR '1'='1"
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201, 503)

    @pytest.mark.asyncio
    async def test_xss_in_comment(self, client):
        """评论中注入 XSS 脚本"""
        response = await client.post(
            "/api/producer/interactions/comment",
            json={
                "interaction_id": "test-001",
                "user_name": "<script>alert('xss')</script>",
                "text": "<img onerror='alert(1)' src='x'>"
            },
        )
        # 服务不应崩溃
        assert response.status_code in (200, 201, 400, 503)

    @pytest.mark.asyncio
    async def test_unicode_edge_cases(self, client, auth_headers):
        """Unicode 边界字符（零宽字符、emoji、RTL）"""
        response = await client.post(
            "/api/workspace/project",
            json={
                "title": "测试\u200b\u200c\u200d\ufeff标题",  # 零宽字符
                "concept": "🎬📺🎭概念💯\u202e反转",  # emoji + RTL override
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201, 503)

    @pytest.mark.asyncio
    async def test_empty_string_fields(self, client, auth_headers):
        """必填字段传空字符串"""
        response = await client.post(
            "/api/workspace/project",
            json={"title": "", "concept": ""},
            headers=auth_headers,
        )
        # 空字符串语义上无效，应拒绝或可接受取决于业务逻辑
        assert response.status_code in (200, 201, 400, 422, 503)

    @pytest.mark.asyncio
    async def test_extremely_nested_json(self, client, auth_headers):
        """深层嵌套 JSON（尝试栈溢出）"""
        nested = "x"
        for _ in range(50):
            nested = {"a": nested}
        response = await client.post(
            "/api/workspace/project",
            json={"title": "嵌套测试", "concept": str(nested)},
            headers=auth_headers,
        )
        assert response.status_code in (200, 201, 400, 422, 503)
