"""
SSE 流式响应工具
用于将 AI 生成的流式文本推送给前端
"""
import json
import asyncio
from typing import AsyncGenerator, Any
from fastapi.responses import StreamingResponse


async def sse_response(
    generator: AsyncGenerator[str, None],
    event_type: str = "message"
) -> StreamingResponse:
    """
    将 AsyncGenerator 包装为 SSE 响应

    前端接收格式:
        event: message
        data: {"content": "文本chunk"}

    结束时发送:
        event: done
        data: {"status": "complete"}
    """
    async def event_stream():
        try:
            async for chunk in generator:
                data = json.dumps({"content": chunk}, ensure_ascii=False)
                yield f"event: {event_type}\ndata: {data}\n\n"
            # 发送结束信号
            yield f"event: done\ndata: {json.dumps({'status': 'complete'})}\n\n"
        except Exception as e:
            error_data = json.dumps({"error": str(e)}, ensure_ascii=False)
            yield f"event: error\ndata: {error_data}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Nginx 禁用缓冲
        }
    )


async def sse_multi_stage_response(stages: list[dict]) -> StreamingResponse:
    """
    多阶段 SSE 响应 - 用于方案生成等多步骤流程

    stages 格式:
    [
        {"name": "prophet", "generator": async_gen, "label": "舆情分析"},
        {"name": "soul", "generator": async_gen, "label": "角色建模"},
        ...
    ]

    前端接收格式:
        event: stage_start
        data: {"stage": "prophet", "label": "舆情分析"}

        event: message
        data: {"stage": "prophet", "content": "chunk"}

        event: stage_end
        data: {"stage": "prophet", "status": "complete"}
    """
    async def event_stream():
        for stage in stages:
            stage_name = stage["name"]
            label = stage.get("label", stage_name)
            generator = stage["generator"]

            # 阶段开始
            yield f"event: stage_start\ndata: {json.dumps({'stage': stage_name, 'label': label}, ensure_ascii=False)}\n\n"

            try:
                async for chunk in generator:
                    data = json.dumps({"stage": stage_name, "content": chunk}, ensure_ascii=False)
                    yield f"event: message\ndata: {data}\n\n"

                # 阶段完成
                yield f"event: stage_end\ndata: {json.dumps({'stage': stage_name, 'status': 'complete'})}\n\n"
            except Exception as e:
                error_data = json.dumps({"stage": stage_name, "error": str(e)}, ensure_ascii=False)
                yield f"event: stage_error\ndata: {error_data}\n\n"

        # 全部完成
        yield f"event: done\ndata: {json.dumps({'status': 'all_complete'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


def format_sse(data: Any, event: str = "message") -> str:
    """格式化单条 SSE 消息"""
    json_data = json.dumps(data, ensure_ascii=False) if not isinstance(data, str) else data
    return f"event: {event}\ndata: {json_data}\n\n"
