"""
Object storage helpers.

Production features that need public file URLs, such as DashScope voice clone
reference audio and exported assets, should use OSS instead of local temp files.
"""
from __future__ import annotations

import mimetypes
from datetime import datetime
from uuid import uuid4

from app.config import get_settings

settings = get_settings()


class StorageNotConfigured(RuntimeError):
    pass


class StorageService:
    @property
    def bucket_name(self) -> str:
        return settings.OSS_BUCKET_NAME or settings.OSS_BUCKET

    def is_configured(self) -> bool:
        return bool(
            settings.OSS_ACCESS_KEY_ID
            and settings.OSS_ACCESS_KEY_SECRET
            and self.bucket_name
            and settings.OSS_ENDPOINT
        )

    async def upload_bytes(
        self,
        data: bytes,
        filename: str,
        content_type: str | None = None,
        prefix: str | None = None,
    ) -> str:
        """Upload bytes to OSS and return a DashScope-reachable URL."""
        if not self.is_configured():
            raise StorageNotConfigured("OSS 未配置，无法生成公网可访问文件 URL")

        try:
            import oss2
        except ImportError as exc:
            raise StorageNotConfigured("缺少 oss2 依赖，请安装 backend/requirements.txt") from exc

        object_prefix = (prefix or settings.OSS_UPLOAD_PREFIX or "dramagenius").strip("/")
        safe_name = filename.replace("/", "_").replace("\\", "_")
        today = datetime.utcnow().strftime("%Y/%m/%d")
        object_key = f"{object_prefix}/{today}/{uuid4().hex}_{safe_name}"
        content_type = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"

        auth = oss2.Auth(settings.OSS_ACCESS_KEY_ID, settings.OSS_ACCESS_KEY_SECRET)
        bucket = oss2.Bucket(auth, settings.OSS_ENDPOINT, self.bucket_name)
        bucket.put_object(object_key, data, headers={"Content-Type": content_type})

        if settings.OSS_PUBLIC_BASE_URL:
            return f"{settings.OSS_PUBLIC_BASE_URL.rstrip('/')}/{object_key}"

        public_host = f"https://{self.bucket_name}.{settings.OSS_ENDPOINT.strip('/')}"
        return f"{public_host}/{object_key}"


storage_service = StorageService()
