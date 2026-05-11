"""
DramaGenius FastAPI 入口
"""
import os

# ── SSL 证书修复（优先于任何网络连接初始化） ──
# 系统缺少 /etc/ssl/cert.pem 时，用 certifi 的 CA bundle
try:
    import certifi
    _cert = certifi.where()
    os.environ.setdefault("SSL_CERT_FILE", _cert)
    os.environ.setdefault("REQUESTS_CA_BUNDLE", _cert)
except ImportError:
    pass
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from urllib.parse import unquote

from app.config import get_settings
from app.routers import auth, prophet, soul, arbiter, workspace, producer

settings = get_settings()

# 确保临时音频目录存在
STATIC_TEMP_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "temp")
os.makedirs(STATIC_TEMP_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # ── 启动 ──
    print(f"🎬 {settings.APP_NAME} v{settings.APP_VERSION} starting...")
    print(f"📌 Environment: {settings.ENVIRONMENT}")
    
    # 数据库连接（开发模式可跳过）
    if settings.DEV_SKIP_DB:
        print("⚠️  DEV_SKIP_DB=true, skipping database connection")
    else:
        from app.models.database import init_db
        await init_db()
        print("✅ Database connected")

    yield

    # ── 关闭 ──
    if not settings.DEV_SKIP_DB:
        from app.models.database import close_db
        await close_db()
    print("🛑 Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI 驱动的短剧创作平台",
    lifespan=lifespan,
)

# ── 静态文件（临时音频，供 DashScope 访问） ──
app.mount("/static/temp", StaticFiles(directory=STATIC_TEMP_DIR), name="temp_audio")

# ── GZip 压缩（>500 bytes 自动压缩） ──
app.add_middleware(GZipMiddleware, minimum_size=500)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 路由注册 ──
app.include_router(auth.router, prefix=f"{settings.API_PREFIX}/auth", tags=["认证"])
app.include_router(prophet.router, prefix=f"{settings.API_PREFIX}/prophet", tags=["Prophet 舆情"])
app.include_router(soul.router, prefix=f"{settings.API_PREFIX}/soul", tags=["Soul 角色"])
app.include_router(arbiter.router, prefix=f"{settings.API_PREFIX}/arbiter", tags=["Arbiter 决策"])
app.include_router(workspace.router, prefix=f"{settings.API_PREFIX}/workspace", tags=["Workspace 创作"])
app.include_router(producer.router, prefix=f"{settings.API_PREFIX}/producer", tags=["Producer 视频制片"])


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/ready")
async def readiness_check():
    """Production dependency readiness: database, Redis, and Elasticsearch."""
    checks = {}

    if settings.DEV_SKIP_DB:
        checks["database"] = "disabled"
    else:
        try:
            from sqlalchemy import text
            from app.models.database import async_session
            async with async_session() as session:
                await session.execute(text("SELECT 1"))
            checks["database"] = "ok"
        except Exception as exc:
            checks["database"] = f"failed: {exc}"

    try:
        import redis.asyncio as redis
        client = redis.from_url(settings.REDIS_URL)
        await client.ping()
        await client.aclose()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = f"failed: {exc}"

    try:
        from app.services.search_service import search_service
        await search_service.connect()
        health = await search_service.client.cluster.health()
        checks["elasticsearch"] = health.get("status", "ok")
    except Exception as exc:
        checks["elasticsearch"] = f"failed: {exc}"
        try:
            await search_service.close()
            search_service.client = None
        except Exception:
            pass

    ready = all(value in {"ok", "green", "yellow"} for value in checks.values())
    return {
        "status": "ready" if ready else "not_ready",
        "checks": checks,
        "demo_data_enabled": settings.ALLOW_DEMO_DATA,
        "dev_skip_db": settings.DEV_SKIP_DB,
    }


# ── 前端静态文件托管（生产模式） ──
# 将构建好的前端 dist/ 作为静态文件服务，SPA fallback 到 index.html
DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "dist")
if os.path.isdir(DIST_DIR):
    from fastapi.responses import FileResponse

    # 静态资源（JS/CSS/images）- 带 hash 文件名，设置长缓存
    _assets_dir = os.path.join(DIST_DIR, "assets")

    @app.middleware("http")
    async def cache_static_assets(request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/assets/"):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response

    app.mount("/assets", StaticFiles(directory=_assets_dir), name="frontend_assets")

    # 视频文件（支持 Range 请求，视频进度条拖拽必需）
    # 匹配 /videos/ 和 /drama/ 下的 .mp4 文件
    _videos_dir = os.path.join(DIST_DIR, "videos")
    _drama_dir = os.path.join(DIST_DIR, "drama")

    async def _serve_video_file(file_path: str, request: Request):
        """通用视频文件服务 - 使用 FileResponse 原生支持 Range / 异步 IO / ETag"""
        if not os.path.isfile(file_path):
            return FileResponse(os.path.join(DIST_DIR, "index.html"))
        return FileResponse(
            file_path,
            media_type="video/mp4",
            headers={"Cache-Control": "public, max-age=86400"},
        )

    if os.path.isdir(_videos_dir):
        @app.get("/videos/{video_name:path}")
        @app.head("/videos/{video_name:path}")
        async def serve_video(video_name: str, request: Request):
            return await _serve_video_file(
                os.path.join(_videos_dir, unquote(video_name)), request
            )

    if os.path.isdir(_drama_dir):
        @app.get("/drama/{video_name:path}")
        @app.head("/drama/{video_name:path}")
        async def serve_drama_video(video_name: str, request: Request):
            return await _serve_video_file(
                os.path.join(_drama_dir, unquote(video_name)), request
            )

    # public 目录下的文件（favicon 等）
    _public_dir = os.path.join(os.path.dirname(__file__), "..", "..", "public")
    if os.path.isdir(_public_dir):
        app.mount("/public", StaticFiles(directory=_public_dir), name="public_files")

    # SPA fallback: 所有非 /api 和非静态资源的请求返回 index.html
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # 如果请求的是具体的静态文件且存在，直接返回
        file_path = os.path.join(DIST_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        # 否则返回 index.html（SPA 路由）
        return FileResponse(os.path.join(DIST_DIR, "index.html"))
