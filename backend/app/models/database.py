"""
数据库连接与会话管理
"""
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

engine = None
async_session = None

if not settings.DEV_SKIP_DB:
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        pool_size=20,
        max_overflow=10,
    )
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    """初始化数据库 - 创建所有表"""
    if engine is None:
        return
    async with engine.begin() as conn:
        # 导入所有模型以确保它们被注册
        from app.models import user, project, script, producer  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """关闭数据库连接"""
    if engine is not None:
        await engine.dispose()


async def get_db():
    """获取数据库会话 - 用于 FastAPI 依赖注入"""
    if async_session is None:
        # DEV_SKIP_DB 模式：yield None，路由内部需自行判断
        yield None
        return
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
