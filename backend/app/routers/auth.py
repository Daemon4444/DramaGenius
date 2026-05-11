"""
认证路由 - 登录、注册、刷新 Token
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import get_db
from app.models.user import User
from app.utils.auth import (
    verify_password, hash_password, create_tokens, decode_token,
    get_current_user_id, TokenResponse
)
from app.config import get_settings

router = APIRouter()
settings = get_settings()


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: str | None
    is_vip: bool

    class Config:
        from_attributes = True


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """用户注册"""
    if settings.DEV_SKIP_DB:
        if not settings.ALLOW_DEMO_DATA:
            raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时认证不可用于生产验证")
        # Demo 模式：直接返回 mock token
        return create_tokens("demo-user-001")

    # 检查邮箱是否已存在
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="邮箱已被注册")

    # 创建用户
    user = User(
        email=req.email,
        name=req.name,
        password_hash=hash_password(req.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return create_tokens(str(user.id))


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """用户登录 - Demo 模式：任意账密均可进入"""
    if settings.DEV_SKIP_DB or db is None:
        return create_tokens("demo-user-001")

    # 查找用户，存在则用其 ID；不存在也允许登录（Demo 放行）
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    if user:
        return create_tokens(str(user.id))

    # 用户不存在时使用默认 demo 用户
    return create_tokens("00000000-0000-0000-0000-000000000001")


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(req: RefreshRequest):
    """刷新 Token"""
    token_data = decode_token(req.refresh_token)
    if token_data.type != "refresh":
        raise HTTPException(status_code=401, detail="无效的 refresh token")
    return create_tokens(token_data.sub)


@router.get("/me", response_model=UserResponse)
async def get_me(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取当前用户信息"""
    if settings.DEV_SKIP_DB:
        if not settings.ALLOW_DEMO_DATA:
            raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时用户信息不可用于生产验证")
        return UserResponse(
            id=user_id or "demo-user-001",
            email="demo@example.com",
            name="Demo 用户",
            avatar_url=None,
            is_vip=False
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return UserResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        avatar_url=user.avatar_url,
        is_vip=user.is_vip
    )
