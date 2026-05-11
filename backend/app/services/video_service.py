"""
百炼视频生成服务
接入 DashScope VideoSynthesis API (HappyHorse / WAN)
"""
import os
import asyncio
import logging
from http import HTTPStatus
import httpx
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# 延迟导入：避免 dashscope 未安装时报错
_VideoSynthesis = None


def _get_video_synthesis():
    global _VideoSynthesis
    if _VideoSynthesis is None:
        try:
            from dashscope import VideoSynthesis
            _VideoSynthesis = VideoSynthesis
        except ImportError:
            _VideoSynthesis = False
    return _VideoSynthesis


class VideoService:
    """百炼视频生成服务"""

    @property
    def api_key(self) -> str:
        """惰性读取 API key，避免模块导入时 .env 尚未加载"""
        return os.getenv("DASHSCOPE_API_KEY") or settings.DASHSCOPE_API_KEY or ""

    async def submit_task(
        self,
        prompt: str,
        model: str | None = None,
        size: str = "720*1280",
        duration: int = 5,
        negative_prompt: str = "",
        prompt_extend: bool = True,
        seed: int | None = None,
        reference_image_urls: list[str] | None = None,
    ) -> dict:
        """
        提交视频生成任务（异步）
        返回 { task_id, status }
        """
        if not self.api_key:
            raise ValueError("DASHSCOPE_API_KEY 未设置")

        reference_image_urls = [u for u in (reference_image_urls or []) if u]
        model = self.normalize_model(model or settings.VIDEO_MODEL_DEFAULT)
        if reference_image_urls:
            model = settings.HAPPYHORSE_R2V_MODEL

        VS = _get_video_synthesis()
        if not VS or model.startswith(("happyhorse-", "wanx")):
            return await self._submit_task_http(
                prompt=prompt,
                model=model,
                size=size,
                duration=duration,
                negative_prompt=negative_prompt,
                prompt_extend=prompt_extend,
                seed=seed,
                reference_image_urls=reference_image_urls,
            )

        loop = asyncio.get_event_loop()

        kwargs = dict(
            api_key=self.api_key,
            model=model,
            prompt=prompt,
            size=size,
            duration=duration,
            prompt_extend=prompt_extend,
            watermark=False,
        )
        if negative_prompt:
            kwargs["negative_prompt"] = negative_prompt
        if seed is not None:
            kwargs["seed"] = seed

        rsp = await loop.run_in_executor(None, lambda: VS.async_call(**kwargs))

        if rsp.status_code != HTTPStatus.OK:
            raise RuntimeError(f"WAN 提交失败: [{rsp.code}] {rsp.message}")

        return {
            "task_id": rsp.output.task_id,
            "status": rsp.output.task_status,
        }

    async def check_status(self, task_id: str) -> dict:
        """
        检查任务状态
        返回 { task_id, status, video_url?, message? }
        """
        if not self.api_key:
            raise ValueError("DASHSCOPE_API_KEY 未设置")

        VS = _get_video_synthesis()
        if not VS:
            return await self._check_status_http(task_id)

        loop = asyncio.get_event_loop()

        rsp = await loop.run_in_executor(
            None, lambda: VS.fetch(task=task_id, api_key=self.api_key)
        )

        if rsp.status_code != HTTPStatus.OK:
            return {"task_id": task_id, "status": "FAILED", "message": f"[{rsp.code}] {rsp.message}"}

        result = {
            "task_id": task_id,
            "status": rsp.output.task_status,
        }

        if rsp.output.task_status == "SUCCEEDED":
            result["video_url"] = getattr(rsp.output, "video_url", None)
        elif rsp.output.task_status == "FAILED":
            result["message"] = getattr(rsp.output, "message", "未知错误")

        return result

    async def _submit_task_http(
        self,
        prompt: str,
        model: str,
        size: str,
        duration: int,
        negative_prompt: str = "",
        prompt_extend: bool = True,
        seed: int | None = None,
        reference_image_urls: list[str] | None = None,
    ) -> dict:
        """DashScope HTTP async task API fallback for SDK versions without VideoSynthesis."""
        reference_image_urls = [u for u in (reference_image_urls or []) if u]
        model = self.normalize_model(model)
        if reference_image_urls:
            model = settings.HAPPYHORSE_R2V_MODEL
        resolution, ratio = self._normalize_video_size(size)
        parameters = {"watermark": False}
        if model.startswith("happyhorse-"):
            parameters.update({"duration": duration, "resolution": resolution, "ratio": ratio})
        else:
            parameters.update({"size": size, "prompt_extend": prompt_extend})
        if seed is not None:
            parameters["seed"] = seed
        if negative_prompt and not model.startswith("happyhorse-"):
            parameters["negative_prompt"] = negative_prompt

        input_payload = {"prompt": prompt}
        if reference_image_urls:
            input_payload["media"] = [
                {"type": "reference_image", "url": url}
                for url in reference_image_urls[:9]
            ]

        payload = {
            "model": model,
            "input": input_payload,
            "parameters": parameters,
        }
        url = f"{settings.VIDEO_API_BASE.rstrip('/')}/services/aigc/video-generation/video-synthesis"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-DashScope-Async": "enable",
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            rsp = await client.post(url, json=payload, headers=headers)
        data = rsp.json() if rsp.headers.get("content-type", "").startswith("application/json") else {}
        if rsp.status_code >= 400 or data.get("code"):
            raise RuntimeError(f"视频任务提交失败: [{data.get('code', rsp.status_code)}] {data.get('message', rsp.text[:200])}")

        output = data.get("output") or {}
        return {
            "task_id": output.get("task_id"),
            "status": output.get("task_status", "PENDING"),
            "request_id": data.get("request_id"),
        }

    async def _check_status_http(self, task_id: str) -> dict:
        url = f"{settings.VIDEO_API_BASE.rstrip('/')}/tasks/{task_id}"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        async with httpx.AsyncClient(timeout=60.0) as client:
            rsp = await client.get(url, headers=headers)
        data = rsp.json() if rsp.headers.get("content-type", "").startswith("application/json") else {}
        if rsp.status_code >= 400 or data.get("code"):
            return {
                "task_id": task_id,
                "status": "FAILED",
                "message": f"[{data.get('code', rsp.status_code)}] {data.get('message', rsp.text[:200])}",
            }

        output = data.get("output") or {}
        result = {
            "task_id": output.get("task_id", task_id),
            "status": output.get("task_status", "UNKNOWN"),
            "request_id": data.get("request_id"),
        }
        if output.get("video_url"):
            result["video_url"] = output["video_url"]
        if output.get("message"):
            result["message"] = output["message"]
        if output.get("code"):
            result["code"] = output["code"]
        return result

    @staticmethod
    def normalize_model(model: str | None) -> str:
        """Normalize UI/legacy aliases to real DashScope video model ids."""
        aliases = {
            "wan2.1-t2v-turbo": "wanx2.1-t2v-turbo",
            "wan2.1-t2v-plus": "wanx2.1-t2v-plus",
            "wan-turbo": "wanx2.1-t2v-turbo",
            "wan-plus": "wanx2.1-t2v-plus",
            "one-turbo": "wanx2.1-t2v-turbo",
            "one-plus": "wanx2.1-t2v-plus",
            "happyhorse": settings.HAPPYHORSE_T2V_MODEL,
            "hobby-house": settings.HAPPYHORSE_T2V_MODEL,
            "hobbyhouse": settings.HAPPYHORSE_T2V_MODEL,
            "happyhorse-one": settings.HAPPYHORSE_T2V_MODEL,
            "happyhorse-r2v": settings.HAPPYHORSE_R2V_MODEL,
            "r2v": settings.HAPPYHORSE_R2V_MODEL,
            "reference-to-video": settings.HAPPYHORSE_R2V_MODEL,
        }
        value = (model or settings.VIDEO_MODEL_DEFAULT).strip()
        return aliases.get(value, value)

    @staticmethod
    def _normalize_video_size(size: str) -> tuple[str, str]:
        mapping = {
            "720*1280": ("720P", "9:16"),
            "1280*720": ("720P", "16:9"),
            "960*960": ("720P", "1:1"),
            "1080*1920": ("1080P", "9:16"),
            "1920*1080": ("1080P", "16:9"),
            "1440*1440": ("1080P", "1:1"),
        }
        return mapping.get(size, ("720P", "9:16"))


# 全局单例
video_service = VideoService()
