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

        # 生成签名 URL（1小时有效），因为 bucket 阻止了公共访问
        # 使用公网 endpoint 生成签名 URL（内网 endpoint 外部不可访问）
        public_endpoint = settings.OSS_ENDPOINT.replace("-internal", "")
        public_bucket = oss2.Bucket(auth, public_endpoint, self.bucket_name)
        signed_url = public_bucket.sign_url("GET", object_key, 3600)
        return signed_url


storage_service = StorageService()
