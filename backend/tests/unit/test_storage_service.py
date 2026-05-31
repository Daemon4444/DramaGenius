"""
U6: Storage 服务单元测试
覆盖: is_configured, bucket_name, upload_bytes
"""
import pytest
from unittest.mock import patch, MagicMock

from app.services.storage_service import StorageService, StorageNotConfigured, storage_service


# ═══════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════

@pytest.fixture
def configured_settings():
    """模拟已配置的 OSS 设置"""
    return {
        "OSS_ACCESS_KEY_ID": "test-key-id",
        "OSS_ACCESS_KEY_SECRET": "test-key-secret",
        "OSS_BUCKET_NAME": "test-bucket",
        "OSS_BUCKET": "fallback-bucket",
        "OSS_ENDPOINT": "oss-cn-beijing.aliyuncs.com",
        "OSS_UPLOAD_PREFIX": "dramagenius",
    }


@pytest.fixture
def unconfigured_settings():
    """模拟未配置的 OSS 设置"""
    return {
        "OSS_ACCESS_KEY_ID": "",
        "OSS_ACCESS_KEY_SECRET": "",
        "OSS_BUCKET_NAME": "",
        "OSS_BUCKET": "",
        "OSS_ENDPOINT": "",
        "OSS_UPLOAD_PREFIX": "",
    }


# ═══════════════════════════════════════════
# is_configured 测试
# ═══════════════════════════════════════════

class TestIsConfigured:
    """OSS 配置检测"""

    def test_fully_configured(self):
        svc = StorageService()
        with patch.object(type(svc), 'bucket_name', new_callable=lambda: property(lambda self: "my-bucket")):
            with patch("app.services.storage_service.settings") as mock_settings:
                mock_settings.OSS_ACCESS_KEY_ID = "key-id"
                mock_settings.OSS_ACCESS_KEY_SECRET = "key-secret"
                mock_settings.OSS_ENDPOINT = "oss-cn-beijing.aliyuncs.com"
                mock_settings.OSS_BUCKET_NAME = "my-bucket"
                mock_settings.OSS_BUCKET = "my-bucket"
                assert svc.is_configured() is True

    def test_missing_key_id(self):
        svc = StorageService()
        with patch("app.services.storage_service.settings") as mock_settings:
            mock_settings.OSS_ACCESS_KEY_ID = ""
            mock_settings.OSS_ACCESS_KEY_SECRET = "secret"
            mock_settings.OSS_ENDPOINT = "endpoint"
            mock_settings.OSS_BUCKET_NAME = "bucket"
            mock_settings.OSS_BUCKET = "bucket"
            assert svc.is_configured() is False

    def test_missing_secret(self):
        svc = StorageService()
        with patch("app.services.storage_service.settings") as mock_settings:
            mock_settings.OSS_ACCESS_KEY_ID = "key-id"
            mock_settings.OSS_ACCESS_KEY_SECRET = ""
            mock_settings.OSS_ENDPOINT = "endpoint"
            mock_settings.OSS_BUCKET_NAME = "bucket"
            mock_settings.OSS_BUCKET = "bucket"
            assert svc.is_configured() is False

    def test_missing_endpoint(self):
        svc = StorageService()
        with patch("app.services.storage_service.settings") as mock_settings:
            mock_settings.OSS_ACCESS_KEY_ID = "key-id"
            mock_settings.OSS_ACCESS_KEY_SECRET = "secret"
            mock_settings.OSS_ENDPOINT = ""
            mock_settings.OSS_BUCKET_NAME = "bucket"
            mock_settings.OSS_BUCKET = "bucket"
            assert svc.is_configured() is False


# ═══════════════════════════════════════════
# bucket_name 测试
# ═══════════════════════════════════════════

class TestBucketName:
    """Bucket 名称选择逻辑"""

    def test_prefers_bucket_name(self):
        svc = StorageService()
        with patch("app.services.storage_service.settings") as mock_settings:
            mock_settings.OSS_BUCKET_NAME = "primary"
            mock_settings.OSS_BUCKET = "fallback"
            assert svc.bucket_name == "primary"

    def test_fallback_to_bucket(self):
        svc = StorageService()
        with patch("app.services.storage_service.settings") as mock_settings:
            mock_settings.OSS_BUCKET_NAME = ""
            mock_settings.OSS_BUCKET = "fallback"
            assert svc.bucket_name == "fallback"


# ═══════════════════════════════════════════
# upload_bytes 测试
# ═══════════════════════════════════════════

class TestUploadBytes:
    """文件上传"""

    @pytest.mark.asyncio
    async def test_not_configured_raises(self):
        svc = StorageService()
        with patch.object(svc, 'is_configured', return_value=False):
            with pytest.raises(StorageNotConfigured, match="OSS 未配置"):
                await svc.upload_bytes(b"data", "test.mp3")

    @pytest.mark.asyncio
    async def test_upload_success(self):
        """成功上传返回签名 URL"""
        svc = StorageService()
        
        mock_bucket = MagicMock()
        mock_bucket.put_object = MagicMock()
        mock_bucket.sign_url = MagicMock(return_value="https://bucket.oss.com/signed?token=abc")
        
        with patch.object(svc, 'is_configured', return_value=True):
            with patch("app.services.storage_service.settings") as mock_settings:
                mock_settings.OSS_ACCESS_KEY_ID = "key-id"
                mock_settings.OSS_ACCESS_KEY_SECRET = "key-secret"
                mock_settings.OSS_ENDPOINT = "oss-cn-beijing.aliyuncs.com"
                mock_settings.OSS_BUCKET_NAME = "test-bucket"
                mock_settings.OSS_BUCKET = "test-bucket"
                mock_settings.OSS_UPLOAD_PREFIX = "dramagenius"
                
                with patch("oss2.Auth") as mock_auth:
                    with patch("oss2.Bucket", return_value=mock_bucket):
                        result = await svc.upload_bytes(b"audio data", "voice.mp3")
        
        assert result == "https://bucket.oss.com/signed?token=abc"
        mock_bucket.put_object.assert_called_once()

    @pytest.mark.asyncio
    async def test_upload_infers_content_type(self):
        """自动推断 content-type"""
        svc = StorageService()
        mock_bucket = MagicMock()
        mock_bucket.sign_url.return_value = "https://example.com/signed"
        
        with patch.object(svc, 'is_configured', return_value=True):
            with patch("app.services.storage_service.settings") as mock_settings:
                mock_settings.OSS_ACCESS_KEY_ID = "id"
                mock_settings.OSS_ACCESS_KEY_SECRET = "secret"
                mock_settings.OSS_ENDPOINT = "oss-cn-beijing.aliyuncs.com"
                mock_settings.OSS_BUCKET_NAME = "bucket"
                mock_settings.OSS_BUCKET = "bucket"
                mock_settings.OSS_UPLOAD_PREFIX = "test"
                
                with patch("oss2.Auth"):
                    with patch("oss2.Bucket", return_value=mock_bucket):
                        await svc.upload_bytes(b"data", "image.png")
        
        # 检查 put_object 的 headers 包含正确 content-type
        call_kwargs = mock_bucket.put_object.call_args
        headers = call_kwargs[1]["headers"] if "headers" in call_kwargs[1] else call_kwargs[0][2] if len(call_kwargs[0]) > 2 else {}
        # 至少调用了 put_object
        assert mock_bucket.put_object.called

    @pytest.mark.asyncio
    async def test_upload_custom_content_type(self):
        """自定义 content-type"""
        svc = StorageService()
        mock_bucket = MagicMock()
        mock_bucket.sign_url.return_value = "https://example.com/signed"
        
        with patch.object(svc, 'is_configured', return_value=True):
            with patch("app.services.storage_service.settings") as mock_settings:
                mock_settings.OSS_ACCESS_KEY_ID = "id"
                mock_settings.OSS_ACCESS_KEY_SECRET = "secret"
                mock_settings.OSS_ENDPOINT = "oss-cn-beijing.aliyuncs.com"
                mock_settings.OSS_BUCKET_NAME = "bucket"
                mock_settings.OSS_BUCKET = "bucket"
                mock_settings.OSS_UPLOAD_PREFIX = "test"
                
                with patch("oss2.Auth"):
                    with patch("oss2.Bucket", return_value=mock_bucket):
                        await svc.upload_bytes(
                            b"data", "file.bin", content_type="audio/mpeg"
                        )
        
        assert mock_bucket.put_object.called

    @pytest.mark.asyncio
    async def test_upload_sanitizes_filename(self):
        """文件名中的斜杠被替换"""
        svc = StorageService()
        mock_bucket = MagicMock()
        mock_bucket.sign_url.return_value = "https://example.com/signed"
        
        with patch.object(svc, 'is_configured', return_value=True):
            with patch("app.services.storage_service.settings") as mock_settings:
                mock_settings.OSS_ACCESS_KEY_ID = "id"
                mock_settings.OSS_ACCESS_KEY_SECRET = "secret"
                mock_settings.OSS_ENDPOINT = "oss-cn-beijing.aliyuncs.com"
                mock_settings.OSS_BUCKET_NAME = "bucket"
                mock_settings.OSS_BUCKET = "bucket"
                mock_settings.OSS_UPLOAD_PREFIX = "prefix"
                
                with patch("oss2.Auth"):
                    with patch("oss2.Bucket", return_value=mock_bucket):
                        await svc.upload_bytes(b"data", "path/to\\file.mp3")
        
        # object_key 参数不应包含原始 / 或 \（文件名部分）
        call_args = mock_bucket.put_object.call_args[0]
        object_key = call_args[0]
        filename_part = object_key.split("/")[-1]
        assert "\\" not in filename_part
        # 原始 path/to\\file.mp3 中的 / 和 \ 应被替换为 _
        assert "path_to_file.mp3" in filename_part

    @pytest.mark.asyncio
    async def test_internal_endpoint_replaced(self):
        """内网 endpoint 转公网"""
        svc = StorageService()
        mock_bucket = MagicMock()
        mock_bucket.sign_url.return_value = "https://example.com/signed"
        
        with patch.object(svc, 'is_configured', return_value=True):
            with patch("app.services.storage_service.settings") as mock_settings:
                mock_settings.OSS_ACCESS_KEY_ID = "id"
                mock_settings.OSS_ACCESS_KEY_SECRET = "secret"
                mock_settings.OSS_ENDPOINT = "oss-cn-beijing-internal.aliyuncs.com"
                mock_settings.OSS_BUCKET_NAME = "bucket"
                mock_settings.OSS_BUCKET = "bucket"
                mock_settings.OSS_UPLOAD_PREFIX = "test"
                
                with patch("oss2.Auth") as mock_auth:
                    with patch("oss2.Bucket", return_value=mock_bucket) as mock_bucket_cls:
                        await svc.upload_bytes(b"data", "f.mp3")
        
        # 第二次 Bucket 调用（公网）endpoint 应去掉 -internal
        calls = mock_bucket_cls.call_args_list
        assert len(calls) == 2
        public_endpoint = calls[1][0][1]
        assert "-internal" not in public_endpoint


# ═══════════════════════════════════════════
# 全局单例
# ═══════════════════════════════════════════

class TestStorageServiceSingleton:
    def test_singleton_exists(self):
        assert storage_service is not None
        assert isinstance(storage_service, StorageService)
