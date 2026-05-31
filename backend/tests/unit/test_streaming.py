"""
U7: SSE 流式响应工具单元测试
覆盖: format_sse, sse_response, sse_multi_stage_response
"""
import json
import pytest

from app.utils.streaming import format_sse, sse_response, sse_multi_stage_response


# ═══════════════════════════════════════════
# format_sse 测试
# ═══════════════════════════════════════════

class TestFormatSSE:
    """format_sse 单条消息格式化"""

    def test_dict_data(self):
        result = format_sse({"content": "hello"}, event="message")
        assert result == 'event: message\ndata: {"content": "hello"}\n\n'

    def test_string_data_not_json_encoded(self):
        """字符串直接透传，不做 JSON 编码"""
        result = format_sse("raw string", event="message")
        assert result == "event: message\ndata: raw string\n\n"

    def test_custom_event_type(self):
        result = format_sse({"stage": "prophet"}, event="stage_start")
        assert result.startswith("event: stage_start\n")

    def test_chinese_content_not_escaped(self):
        result = format_sse({"content": "你好世界"})
        assert "你好世界" in result
        assert "\\u" not in result

    def test_nested_data(self):
        data = {"stage": "soul", "content": {"name": "角色A", "age": 25}}
        result = format_sse(data)
        parsed_data = result.split("data: ")[1].strip()
        assert json.loads(parsed_data) == data

    def test_empty_dict(self):
        result = format_sse({})
        assert "data: {}\n\n" in result

    def test_list_data(self):
        result = format_sse([1, 2, 3])
        assert "data: [1, 2, 3]" in result

    def test_boolean_data(self):
        result = format_sse(True)
        assert "data: true" in result


# ═══════════════════════════════════════════
# sse_response 测试
# ═══════════════════════════════════════════

class TestSSEResponse:
    """sse_response 流式响应包装"""

    @pytest.mark.asyncio
    async def test_normal_stream(self):
        """正常流式输出"""
        async def gen():
            yield "chunk1"
            yield "chunk2"
            yield "chunk3"

        response = await sse_response(gen())
        assert response.media_type == "text/event-stream"
        
        # 收集所有输出
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
        
        full_output = "".join(chunks)
        # 检查内容消息
        assert 'event: message\ndata: {"content": "chunk1"}' in full_output
        assert 'event: message\ndata: {"content": "chunk2"}' in full_output
        assert 'event: message\ndata: {"content": "chunk3"}' in full_output
        # 检查结束信号
        assert 'event: done\ndata: {"status": "complete"}' in full_output

    @pytest.mark.asyncio
    async def test_empty_generator(self):
        """空生成器应只发送 done"""
        async def gen():
            return
            yield  # noqa: unreachable

        response = await sse_response(gen())
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
        
        full_output = "".join(chunks)
        assert "event: message" not in full_output
        assert 'event: done\ndata: {"status": "complete"}' in full_output

    @pytest.mark.asyncio
    async def test_exception_in_generator(self):
        """生成器抛异常应发送 error 事件"""
        async def gen():
            yield "ok"
            raise ValueError("something broke")

        response = await sse_response(gen())
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
        
        full_output = "".join(chunks)
        assert "event: error" in full_output
        assert "something broke" in full_output

    @pytest.mark.asyncio
    async def test_custom_event_type(self):
        async def gen():
            yield "data"

        response = await sse_response(gen(), event_type="custom")
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
        
        full_output = "".join(chunks)
        assert "event: custom" in full_output

    @pytest.mark.asyncio
    async def test_response_headers(self):
        async def gen():
            yield "x"

        response = await sse_response(gen())
        assert response.headers.get("Cache-Control") == "no-cache"
        assert response.headers.get("X-Accel-Buffering") == "no"

    @pytest.mark.asyncio
    async def test_chinese_content_in_stream(self):
        async def gen():
            yield "这是中文内容"

        response = await sse_response(gen())
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
        
        full_output = "".join(chunks)
        assert "这是中文内容" in full_output


# ═══════════════════════════════════════════
# sse_multi_stage_response 测试
# ═══════════════════════════════════════════

class TestSSEMultiStageResponse:
    """sse_multi_stage_response 多阶段流"""

    @pytest.mark.asyncio
    async def test_two_stages(self):
        async def stage1_gen():
            yield "prophet data"

        async def stage2_gen():
            yield "soul data"

        stages = [
            {"name": "prophet", "generator": stage1_gen(), "label": "舆情分析"},
            {"name": "soul", "generator": stage2_gen(), "label": "角色建模"},
        ]

        response = await sse_multi_stage_response(stages)
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
        
        full_output = "".join(chunks)
        
        # 检查阶段开始/结束
        assert '"stage": "prophet", "label": "舆情分析"' in full_output
        assert '"stage": "soul", "label": "角色建模"' in full_output
        assert "event: stage_start" in full_output
        assert "event: stage_end" in full_output
        # 内容
        assert "prophet data" in full_output
        assert "soul data" in full_output
        # 全部完成
        assert '"status": "all_complete"' in full_output

    @pytest.mark.asyncio
    async def test_stage_error_doesnt_stop_pipeline(self):
        """一个阶段出错不应阻止后续阶段"""
        async def bad_gen():
            raise RuntimeError("stage failed")
            yield  # noqa

        async def good_gen():
            yield "still works"

        stages = [
            {"name": "bad", "generator": bad_gen(), "label": "Bad"},
            {"name": "good", "generator": good_gen(), "label": "Good"},
        ]

        response = await sse_multi_stage_response(stages)
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
        
        full_output = "".join(chunks)
        assert "event: stage_error" in full_output
        assert "stage failed" in full_output
        assert "still works" in full_output
        assert '"status": "all_complete"' in full_output

    @pytest.mark.asyncio
    async def test_empty_stages(self):
        """无阶段直接发 done"""
        response = await sse_multi_stage_response([])
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
        
        full_output = "".join(chunks)
        assert '"status": "all_complete"' in full_output

    @pytest.mark.asyncio
    async def test_stage_without_label_uses_name(self):
        async def gen():
            yield "x"

        stages = [{"name": "test_stage", "generator": gen()}]
        response = await sse_multi_stage_response(stages)
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
        
        full_output = "".join(chunks)
        assert '"label": "test_stage"' in full_output

    @pytest.mark.asyncio
    async def test_multi_chunk_stage(self):
        async def gen():
            yield "a"
            yield "b"
            yield "c"

        stages = [{"name": "multi", "generator": gen(), "label": "Multi"}]
        response = await sse_multi_stage_response(stages)
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
        
        full_output = "".join(chunks)
        # 所有 message 都应包含 stage 名
        assert full_output.count('"stage": "multi"') >= 3  # 3 messages + start + end
