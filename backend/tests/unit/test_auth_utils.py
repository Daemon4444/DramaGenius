"""
U1: auth 工具单元测试
覆盖: JWT 生成/解析、密码哈希/验证、依赖注入函数
"""
import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock

import pytest
from jose import jwt
from fastapi import HTTPException

from app.utils.auth import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    create_tokens,
    decode_token,
    get_current_user_id,
    get_current_user_id_optional,
    TokenPayload,
    TokenResponse,
    settings,
)


# ═══════════════════════════════════════════
# 密码哈希测试
# ═══════════════════════════════════════════

class TestPasswordHashing:
    """密码哈希与验证"""

    def test_hash_password_returns_bcrypt_hash(self):
        hashed = hash_password("mypassword123")
        assert hashed.startswith("$2b$")
        assert len(hashed) == 60

    def test_verify_password_correct(self):
        hashed = hash_password("secret")
        assert verify_password("secret", hashed) is True

    def test_verify_password_incorrect(self):
        hashed = hash_password("secret")
        assert verify_password("wrong", hashed) is False

    def test_hash_password_different_each_time(self):
        """bcrypt 每次生成不同 salt"""
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2

    def test_empty_password(self):
        hashed = hash_password("")
        assert verify_password("", hashed) is True
        assert verify_password("notempty", hashed) is False

    def test_unicode_password(self):
        hashed = hash_password("密码测试🔐")
        assert verify_password("密码测试🔐", hashed) is True
        assert verify_password("密码测试", hashed) is False

    def test_long_password(self):
        """bcrypt 截断72字节 - 但仍应正常工作"""
        long_pw = "a" * 100
        hashed = hash_password(long_pw)
        assert verify_password(long_pw, hashed) is True


# ═══════════════════════════════════════════
# JWT Token 创建测试
# ═══════════════════════════════════════════

class TestTokenCreation:
    """JWT Token 生成"""

    def test_create_access_token_structure(self):
        user_id = str(uuid.uuid4())
        token = create_access_token(user_id)
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        assert payload["sub"] == user_id
        assert payload["type"] == "access"
        assert "exp" in payload

    def test_create_access_token_expiry(self):
        token = create_access_token("user-1")
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        exp = datetime.utcfromtimestamp(payload["exp"])
        now = datetime.utcnow()
        # 应在 JWT_ACCESS_TOKEN_EXPIRE_MINUTES 分钟后过期 (允许几秒误差)
        delta = exp - now
        expected_minutes = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        assert abs(delta.total_seconds() - expected_minutes * 60) < 5

    def test_create_refresh_token_structure(self):
        user_id = "test-user-123"
        token = create_refresh_token(user_id)
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        assert payload["sub"] == user_id
        assert payload["type"] == "refresh"

    def test_create_refresh_token_expiry(self):
        token = create_refresh_token("user-1")
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        exp = datetime.utcfromtimestamp(payload["exp"])
        now = datetime.utcnow()
        delta = exp - now
        expected_days = settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
        assert abs(delta.total_seconds() - expected_days * 86400) < 5

    def test_create_tokens_returns_both(self):
        user_id = str(uuid.uuid4())
        response = create_tokens(user_id)
        assert isinstance(response, TokenResponse)
        assert response.token_type == "bearer"
        assert response.expires_in == settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        # 验证两个 token 可解码
        access_payload = jwt.decode(response.access_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        refresh_payload = jwt.decode(response.refresh_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        assert access_payload["sub"] == user_id
        assert refresh_payload["sub"] == user_id
        assert access_payload["type"] == "access"
        assert refresh_payload["type"] == "refresh"


# ═══════════════════════════════════════════
# JWT Token 解码测试
# ═══════════════════════════════════════════

class TestTokenDecoding:
    """JWT Token 解码"""

    def test_decode_valid_access_token(self):
        user_id = "decode-test-user"
        token = create_access_token(user_id)
        payload = decode_token(token)
        assert isinstance(payload, TokenPayload)
        assert payload.sub == user_id
        assert payload.type == "access"

    def test_decode_valid_refresh_token(self):
        user_id = "decode-test-user"
        token = create_refresh_token(user_id)
        payload = decode_token(token)
        assert payload.sub == user_id
        assert payload.type == "refresh"

    def test_decode_expired_token_raises_401(self):
        """过期 token 应抛出 401"""
        payload = {
            "sub": "user-1",
            "exp": datetime.utcnow() - timedelta(hours=1),
            "type": "access"
        }
        token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
        with pytest.raises(HTTPException) as exc_info:
            decode_token(token)
        assert exc_info.value.status_code == 401

    def test_decode_invalid_signature_raises_401(self):
        """错误签名的 token"""
        payload = {
            "sub": "user-1",
            "exp": datetime.utcnow() + timedelta(hours=1),
            "type": "access"
        }
        token = jwt.encode(payload, "wrong-secret", algorithm="HS256")
        with pytest.raises(HTTPException) as exc_info:
            decode_token(token)
        assert exc_info.value.status_code == 401

    def test_decode_malformed_token_raises_401(self):
        """畸形 token"""
        with pytest.raises(HTTPException) as exc_info:
            decode_token("not.a.valid.token")
        assert exc_info.value.status_code == 401

    def test_decode_empty_token_raises_401(self):
        with pytest.raises(HTTPException) as exc_info:
            decode_token("")
        assert exc_info.value.status_code == 401

    def test_decode_tampered_payload_raises_401(self):
        """篡改 payload 后签名不匹配"""
        token = create_access_token("user-1")
        parts = token.split(".")
        # 篡改 payload 部分
        parts[1] = parts[1][:-3] + "abc"
        tampered = ".".join(parts)
        with pytest.raises(HTTPException) as exc_info:
            decode_token(tampered)
        assert exc_info.value.status_code == 401


# ═══════════════════════════════════════════
# FastAPI 依赖注入函数测试
# ═══════════════════════════════════════════

class TestGetCurrentUserId:
    """get_current_user_id 依赖"""

    @pytest.mark.asyncio
    async def test_valid_access_token(self):
        user_id = str(uuid.uuid4())
        token = create_access_token(user_id)
        credentials = MagicMock()
        credentials.credentials = token
        result = await get_current_user_id(credentials)
        assert result == user_id

    @pytest.mark.asyncio
    async def test_no_credentials_raises_401(self):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_id(None)
        assert exc_info.value.status_code == 401
        assert "未提供认证信息" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_refresh_token_rejected(self):
        """不允许用 refresh token 访问"""
        token = create_refresh_token("user-1")
        credentials = MagicMock()
        credentials.credentials = token
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_id(credentials)
        assert exc_info.value.status_code == 401
        assert "Token 类型错误" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_expired_token_raises_401(self):
        payload = {
            "sub": "user-1",
            "exp": datetime.utcnow() - timedelta(hours=1),
            "type": "access"
        }
        token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
        credentials = MagicMock()
        credentials.credentials = token
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_id(credentials)
        assert exc_info.value.status_code == 401


class TestGetCurrentUserIdOptional:
    """get_current_user_id_optional 依赖"""

    DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"

    @pytest.mark.asyncio
    async def test_valid_token_returns_user_id(self):
        user_id = str(uuid.uuid4())
        token = create_access_token(user_id)
        credentials = MagicMock()
        credentials.credentials = token
        result = await get_current_user_id_optional(credentials)
        assert result == user_id

    @pytest.mark.asyncio
    async def test_no_credentials_returns_demo_user(self):
        result = await get_current_user_id_optional(None)
        assert result == self.DEMO_USER_ID

    @pytest.mark.asyncio
    async def test_invalid_token_returns_demo_user(self):
        credentials = MagicMock()
        credentials.credentials = "invalid-token"
        result = await get_current_user_id_optional(credentials)
        assert result == self.DEMO_USER_ID

    @pytest.mark.asyncio
    async def test_refresh_token_returns_demo_user(self):
        """refresh token 不是 access 类型，回退到 demo"""
        token = create_refresh_token("user-1")
        credentials = MagicMock()
        credentials.credentials = token
        result = await get_current_user_id_optional(credentials)
        assert result == self.DEMO_USER_ID

    @pytest.mark.asyncio
    async def test_expired_token_returns_demo_user(self):
        payload = {
            "sub": "user-1",
            "exp": datetime.utcnow() - timedelta(hours=1),
            "type": "access"
        }
        token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
        credentials = MagicMock()
        credentials.credentials = token
        result = await get_current_user_id_optional(credentials)
        assert result == self.DEMO_USER_ID
