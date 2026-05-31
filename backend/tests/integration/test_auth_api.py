"""
I1-I4: 认证接口集成测试
覆盖: register, login, refresh, me
在 DEV_SKIP_DB=true 模式下测试 (无需真实数据库)
"""
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.utils.auth import create_access_token, create_refresh_token, create_tokens


# ═══════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ═══════════════════════════════════════════
# POST /api/auth/register
# ═══════════════════════════════════════════

class TestRegister:
    """用户注册"""

    @pytest.mark.asyncio
    async def test_register_dev_skip_db_no_demo(self, client):
        """DEV_SKIP_DB=true 且 ALLOW_DEMO_DATA=false 时返回 503"""
        response = await client.post("/api/auth/register", json={
            "email": "test@example.com",
            "name": "测试用户",
            "password": "password123"
        })
        # DEV_SKIP_DB=true, ALLOW_DEMO_DATA=false -> 503
        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, client):
        """无效邮箱应返回 422"""
        response = await client.post("/api/auth/register", json={
            "email": "not-an-email",
            "name": "Test",
            "password": "password123"
        })
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_missing_name(self, client):
        """缺少 name 字段应返回 422"""
        response = await client.post("/api/auth/register", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_missing_password(self, client):
        """缺少 password 字段应返回 422"""
        response = await client.post("/api/auth/register", json={
            "email": "test@example.com",
            "name": "Test"
        })
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_empty_body(self, client):
        """空请求体应返回 422"""
        response = await client.post("/api/auth/register", json={})
        assert response.status_code == 422


# ═══════════════════════════════════════════
# POST /api/auth/login
# ═══════════════════════════════════════════

class TestLogin:
    """用户登录"""

    @pytest.mark.asyncio
    async def test_login_dev_mode_returns_tokens(self, client):
        """DEV_SKIP_DB 模式下登录应返回 mock tokens"""
        response = await client.post("/api/auth/login", json={
            "email": "user@example.com",
            "password": "any"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0

    @pytest.mark.asyncio
    async def test_login_email_normalized(self, client):
        """邮箱应被标准化处理"""
        response = await client.post("/api/auth/login", json={
            "email": "  User@Example.COM  ",
            "password": "any"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    @pytest.mark.asyncio
    async def test_login_missing_email(self, client):
        """缺少 email 字段"""
        response = await client.post("/api/auth/login", json={
            "password": "pass"
        })
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_login_missing_password(self, client):
        """缺少 password 字段"""
        response = await client.post("/api/auth/login", json={
            "email": "user@example.com"
        })
        assert response.status_code == 422


# ═══════════════════════════════════════════
# POST /api/auth/refresh
# ═══════════════════════════════════════════

class TestRefresh:
    """Token 刷新"""

    @pytest.mark.asyncio
    async def test_refresh_valid_token(self, client):
        """有效 refresh token 应返回新的 token 对"""
        refresh = create_refresh_token("user-123")
        response = await client.post("/api/auth/refresh", json={
            "refresh_token": refresh
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_refresh_with_access_token_rejected(self, client):
        """用 access token 做刷新应被拒绝"""
        access = create_access_token("user-123")
        response = await client.post("/api/auth/refresh", json={
            "refresh_token": access
        })
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_invalid_token(self, client):
        """无效 token"""
        response = await client.post("/api/auth/refresh", json={
            "refresh_token": "invalid.token.here"
        })
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_missing_field(self, client):
        """缺少 refresh_token 字段"""
        response = await client.post("/api/auth/refresh", json={})
        assert response.status_code == 422


# ═══════════════════════════════════════════
# GET /api/auth/me
# ═══════════════════════════════════════════

class TestGetMe:
    """获取当前用户信息"""

    @pytest.mark.asyncio
    async def test_me_no_token_returns_401(self, client):
        """无 token 应返回 401"""
        response = await client.get("/api/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_me_invalid_token_returns_401(self, client):
        """无效 token 应返回 401"""
        response = await client.get("/api/auth/me", headers={
            "Authorization": "Bearer invalid-token"
        })
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_me_with_valid_token_dev_mode(self, client):
        """DEV_SKIP_DB + 有效 token: 返回 503 (ALLOW_DEMO_DATA=false)"""
        token = create_access_token("user-123")
        response = await client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        # DEV_SKIP_DB=true, ALLOW_DEMO_DATA=false -> 503
        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_me_with_refresh_token_rejected(self, client):
        """用 refresh token 访问 me 应返回 401"""
        token = create_refresh_token("user-123")
        response = await client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 401
