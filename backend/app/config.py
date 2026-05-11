"""
DramaGenius 全局配置
通过环境变量或 .env 文件加载
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── App ──
    APP_NAME: str = "DramaGenius"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = "drama-genius-secret-change-in-production"
    API_PREFIX: str = "/api"
    
    # ── 开发模式 ──
    DEV_SKIP_DB: bool = False  # 跳过数据库连接（轻量测试）
    ENVIRONMENT: str = "development"

    # ── Database (PostgreSQL) ──
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/dramagenius"
    DATABASE_SYNC_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/dramagenius"

    # ── Redis ──
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Elasticsearch ──
    ES_URL: str = "http://localhost:9200"
    ES_INDEX_PREFIX: str = "dramagenius"

    # ── DashScope (通义千问) ──
    DASHSCOPE_API_KEY: str = ""
    BAILIAN_BASE_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    QWEN_MODEL_MAX: str = "qwen3.5-plus"
    QWEN_MODEL_PLUS: str = "qwen3.5-plus"
    QWEN_MODEL_TURBO: str = "qwen3.5-plus"

    # ── DashScope Video (百炼视频生成) ──
    VIDEO_MODEL_DEFAULT: str = "wan2.1-t2v-turbo"
    VIDEO_API_BASE: str = "https://dashscope.aliyuncs.com/api/v1"
    HAPPYHORSE_T2V_MODEL: str = "happyhorse-1.0-t2v"
    HAPPYHORSE_I2V_MODEL: str = "happyhorse-1.0-i2v"
    HAPPYHORSE_R2V_MODEL: str = "happyhorse-1.0-r2v"
    HAPPYHORSE_EDIT_MODEL: str = "happyhorse-1.0-video-edit"

    # ── CosyVoice (语音合成) ──
    COSYVOICE_API_KEY: str = ""
    COSYVOICE_MODEL: str = "cosyvoice-v1"

    # ── 公网地址（声音克隆需要 DashScope 可访问的 URL） ──
    PUBLIC_HOST: str = ""  # e.g. http://8.131.68.6:8000

    # ── OSS (阿里云对象存储) ──
    OSS_ACCESS_KEY_ID: str = ""
    OSS_ACCESS_KEY_SECRET: str = ""
    OSS_BUCKET: str = "dramagenius"
    OSS_ENDPOINT: str = "oss-cn-beijing.aliyuncs.com"

    # ── JWT ──
    JWT_SECRET: str = "jwt-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── CORS ──
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        # 公网 IP 访问
        "http://8.131.68.6",
        "http://8.131.68.6:3000",
        "http://8.131.68.6:5173",
        "http://8.131.68.6:8080",
    ]

    # ── Celery ──
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
