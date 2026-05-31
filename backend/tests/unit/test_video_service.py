"""
U4: Video 服务单元测试
覆盖: normalize_model, _normalize_video_size, submit_task, check_status
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from http import HTTPStatus

from app.services.video_service import VideoService, video_service


# ═══════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════

@pytest.fixture
def service():
    return VideoService()


# ═══════════════════════════════════════════
# normalize_model 测试
# ═══════════════════════════════════════════

class TestNormalizeModel:
    """模型别名归一化"""

    def test_wan_turbo_alias(self):
        assert VideoService.normalize_model("wan-turbo") == "wanx2.1-t2v-turbo"

    def test_wan_plus_alias(self):
        assert VideoService.normalize_model("wan-plus") == "wanx2.1-t2v-plus"

    def test_wan21_aliases(self):
        assert VideoService.normalize_model("wan2.1-t2v-turbo") == "wanx2.1-t2v-turbo"
        assert VideoService.normalize_model("wan2.1-t2v-plus") == "wanx2.1-t2v-plus"

    def test_happyhorse_aliases(self):
        result = VideoService.normalize_model("happyhorse")
        assert result == "happyhorse-1.0-t2v"

    def test_hobby_house_alias(self):
        result = VideoService.normalize_model("hobby-house")
        assert result == "happyhorse-1.0-t2v"

    def test_r2v_aliases(self):
        assert VideoService.normalize_model("happyhorse-r2v") == "happyhorse-1.0-r2v"
        assert VideoService.normalize_model("r2v") == "happyhorse-1.0-r2v"
        assert VideoService.normalize_model("reference-to-video") == "happyhorse-1.0-r2v"

    def test_wan_r2v_aliases(self):
        assert VideoService.normalize_model("wan-r2v") == "wan2.6-r2v-flash"
        assert VideoService.normalize_model("wan-reference") == "wan2.6-r2v-flash"

    def test_unknown_model_passthrough(self):
        assert VideoService.normalize_model("my-custom-model") == "my-custom-model"

    def test_none_uses_default(self):
        result = VideoService.normalize_model(None)
        assert result == "wanx2.1-t2v-turbo"

    def test_whitespace_stripped(self):
        assert VideoService.normalize_model("  wan-turbo  ") == "wanx2.1-t2v-turbo"

    def test_one_turbo_alias(self):
        assert VideoService.normalize_model("one-turbo") == "wanx2.1-t2v-turbo"
        assert VideoService.normalize_model("one-plus") == "wanx2.1-t2v-plus"


# ═══════════════════════════════════════════
# _normalize_video_size 测试
# ═══════════════════════════════════════════

class TestNormalizeVideoSize:
    """视频尺寸归一化"""

    def test_720p_portrait(self):
        assert VideoService._normalize_video_size("720*1280") == ("720P", "9:16")

    def test_720p_landscape(self):
        assert VideoService._normalize_video_size("1280*720") == ("720P", "16:9")

    def test_720p_square(self):
        assert VideoService._normalize_video_size("960*960") == ("720P", "1:1")

    def test_1080p_portrait(self):
        assert VideoService._normalize_video_size("1080*1920") == ("1080P", "9:16")

    def test_1080p_landscape(self):
        assert VideoService._normalize_video_size("1920*1080") == ("1080P", "16:9")

    def test_1080p_square(self):
        assert VideoService._normalize_video_size("1440*1440") == ("1080P", "1:1")

    def test_unknown_size_defaults(self):
        assert VideoService._normalize_video_size("1234*5678") == ("720P", "9:16")

    def test_empty_string_defaults(self):
        assert VideoService._normalize_video_size("") == ("720P", "9:16")


# ═══════════════════════════════════════════
# submit_task 测试
# ═══════════════════════════════════════════

class TestSubmitTask:
    """视频生成任务提交"""

    @pytest.mark.asyncio
    async def test_no_api_key_raises(self, service):
        """未设置 API key 应抛出 ValueError"""
        with patch.object(type(service), 'api_key', new_callable=lambda: property(lambda self: "")):
            with pytest.raises(ValueError, match="DASHSCOPE_API_KEY"):
                await service.submit_task("a cat walking")

    @pytest.mark.asyncio
    async def test_submit_task_http_success(self, service):
        """HTTP 提交成功"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "application/json"}
        mock_response.json.return_value = {
            "output": {"task_id": "task-123", "task_status": "PENDING"},
            "request_id": "req-456"
        }

        with patch.object(type(service), 'api_key', new_callable=lambda: property(lambda self: "test-key")):
            with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
                result = await service._submit_task_http(
                    prompt="a cat",
                    model="wanx2.1-t2v-turbo",
                    size="720*1280",
                    duration=5,
                )
        
        assert result["task_id"] == "task-123"
        assert result["status"] == "PENDING"

    @pytest.mark.asyncio
    async def test_submit_task_http_failure(self, service):
        """HTTP 提交失败抛异常"""
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.headers = {"content-type": "application/json"}
        mock_response.json.return_value = {"code": "InvalidParameter", "message": "bad param"}
        mock_response.text = "bad param"

        with patch.object(type(service), 'api_key', new_callable=lambda: property(lambda self: "test-key")):
            with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
                with pytest.raises(RuntimeError, match="视频任务提交失败"):
                    await service._submit_task_http(
                        prompt="test",
                        model="wanx2.1-t2v-turbo",
                        size="720*1280",
                        duration=5,
                    )

    @pytest.mark.asyncio
    async def test_submit_with_reference_video_uses_r2v(self, service):
        """有 reference_video_urls 时强制使用 WAN R2V 模型"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "application/json"}
        mock_response.json.return_value = {
            "output": {"task_id": "t-1", "task_status": "PENDING"},
            "request_id": "r-1"
        }

        with patch.object(type(service), 'api_key', new_callable=lambda: property(lambda self: "test-key")):
            with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response) as mock_post:
                await service.submit_task(
                    prompt="test",
                    reference_video_urls=["http://example.com/video.mp4"],
                )
                call_json = mock_post.call_args[1]["json"]
                assert call_json["model"] == "wan2.6-r2v-flash"

    @pytest.mark.asyncio
    async def test_submit_with_reference_image_uses_happyhorse_r2v(self, service):
        """有 reference_image_urls 时使用 HAPPYHORSE R2V 模型"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "application/json"}
        mock_response.json.return_value = {
            "output": {"task_id": "t-2", "task_status": "PENDING"},
            "request_id": "r-2"
        }

        with patch.object(type(service), 'api_key', new_callable=lambda: property(lambda self: "test-key")):
            with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response) as mock_post:
                await service.submit_task(
                    prompt="test",
                    reference_image_urls=["http://example.com/img.jpg"],
                )
                call_json = mock_post.call_args[1]["json"]
                assert call_json["model"] == "happyhorse-1.0-r2v"


# ═══════════════════════════════════════════
# check_status 测试
# ═══════════════════════════════════════════

class TestCheckStatus:
    """任务状态查询"""

    @pytest.mark.asyncio
    async def test_no_api_key_raises(self, service):
        with patch.object(type(service), 'api_key', new_callable=lambda: property(lambda self: "")):
            with pytest.raises(ValueError, match="DASHSCOPE_API_KEY"):
                await service.check_status("task-1")

    @pytest.mark.asyncio
    async def test_check_status_http_success(self, service):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "application/json"}
        mock_response.json.return_value = {
            "output": {
                "task_id": "task-123",
                "task_status": "SUCCEEDED",
                "video_url": "https://cdn.example.com/video.mp4"
            },
            "request_id": "req-789"
        }

        with patch.object(type(service), 'api_key', new_callable=lambda: property(lambda self: "test-key")):
            with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
                result = await service._check_status_http("task-123")
        
        assert result["task_id"] == "task-123"
        assert result["status"] == "SUCCEEDED"
        assert result["video_url"] == "https://cdn.example.com/video.mp4"

    @pytest.mark.asyncio
    async def test_check_status_http_failed(self, service):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "application/json"}
        mock_response.json.return_value = {
            "output": {
                "task_id": "task-fail",
                "task_status": "FAILED",
                "message": "Generation failed"
            }
        }

        with patch.object(type(service), 'api_key', new_callable=lambda: property(lambda self: "test-key")):
            with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
                result = await service._check_status_http("task-fail")
        
        assert result["status"] == "FAILED"
        assert result["message"] == "Generation failed"

    @pytest.mark.asyncio
    async def test_check_status_http_error_response(self, service):
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.headers = {"content-type": "application/json"}
        mock_response.json.return_value = {"code": "InternalError", "message": "server error"}
        mock_response.text = "server error"

        with patch.object(type(service), 'api_key', new_callable=lambda: property(lambda self: "test-key")):
            with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
                result = await service._check_status_http("task-err")
        
        assert result["status"] == "FAILED"
        assert "InternalError" in result["message"]


# ═══════════════════════════════════════════
# 全局单例
# ═══════════════════════════════════════════

class TestVideoServiceSingleton:
    def test_singleton_exists(self):
        assert video_service is not None
        assert isinstance(video_service, VideoService)
