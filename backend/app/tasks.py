"""
Celery entrypoint.

The production stack starts worker and beat containers so this module must exist
even before heavier crawler/render jobs are scheduled.
"""
from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "dramagenius",
    broker=settings.CELERY_BROKER_URL or settings.REDIS_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Shanghai",
    enable_utc=True,
)


@celery_app.task(name="dramagenius.healthcheck")
def healthcheck() -> dict:
    return {"status": "ok"}
