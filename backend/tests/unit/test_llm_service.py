"""
U2: LLM 服务单元测试 (QwenService)
覆盖: chat, chat_stream, 各业务方法的 prompt 拼接与模型调用
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.llm_service import QwenService, qwen_service


# ═══════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════

@pytest.fixture
def service():
    """创建干净的 QwenService 实例"""
    svc = QwenService()
    svc._client = MagicMock()
    return svc


@pytest.fixture
def mock_chat_response():
    """模拟 OpenAI chat completion 响应"""
    response = MagicMock()
    response.choices = [MagicMock()]
    response.choices[0].message.content = "mock response content"
    return response


@pytest.fixture
def mock_stream_chunks():
    """模拟流式响应 chunks"""
    chunks = []
    for text in ["Hello", " World", "!"]:
        chunk = MagicMock()
        chunk.choices = [MagicMock()]
        chunk.choices[0].delta.content = text
        chunks.append(chunk)
    # 最后一个 chunk content 为 None (表示结束)
    end_chunk = MagicMock()
    end_chunk.choices = [MagicMock()]
    end_chunk.choices[0].delta.content = None
    chunks.append(end_chunk)
    return chunks


# ═══════════════════════════════════════════
# 客户端初始化测试
# ═══════════════════════════════════════════

class TestClientInit:
    """客户端懒初始化"""

    def test_client_is_none_initially(self):
        svc = QwenService()
        assert svc._client is None

    def test_client_lazy_init(self):
        svc = QwenService()
        client = svc.client
        assert client is not None
        # 第二次访问应返回同一实例
        assert svc.client is client


# ═══════════════════════════════════════════
# chat 方法测试
# ═══════════════════════════════════════════

class TestChat:
    """非流式对话"""

    @pytest.mark.asyncio
    async def test_chat_returns_content(self, service, mock_chat_response):
        service.client.chat.completions.create = AsyncMock(return_value=mock_chat_response)
        
        result = await service.chat([{"role": "user", "content": "hello"}])
        assert result == "mock response content"

    @pytest.mark.asyncio
    async def test_chat_uses_default_model(self, service, mock_chat_response):
        service.client.chat.completions.create = AsyncMock(return_value=mock_chat_response)
        
        await service.chat([{"role": "user", "content": "test"}])
        call_kwargs = service.client.chat.completions.create.call_args[1]
        assert call_kwargs["model"] == "qwen3.5-plus"

    @pytest.mark.asyncio
    async def test_chat_custom_model(self, service, mock_chat_response):
        service.client.chat.completions.create = AsyncMock(return_value=mock_chat_response)
        
        await service.chat([{"role": "user", "content": "test"}], model="custom-model")
        call_kwargs = service.client.chat.completions.create.call_args[1]
        assert call_kwargs["model"] == "custom-model"

    @pytest.mark.asyncio
    async def test_chat_passes_temperature(self, service, mock_chat_response):
        service.client.chat.completions.create = AsyncMock(return_value=mock_chat_response)
        
        await service.chat([{"role": "user", "content": "test"}], temperature=0.3)
        call_kwargs = service.client.chat.completions.create.call_args[1]
        assert call_kwargs["temperature"] == 0.3

    @pytest.mark.asyncio
    async def test_chat_passes_max_tokens(self, service, mock_chat_response):
        service.client.chat.completions.create = AsyncMock(return_value=mock_chat_response)
        
        await service.chat([{"role": "user", "content": "test"}], max_tokens=500)
        call_kwargs = service.client.chat.completions.create.call_args[1]
        assert call_kwargs["max_tokens"] == 500

    @pytest.mark.asyncio
    async def test_chat_thinking_mode_disabled_by_default(self, service, mock_chat_response):
        service.client.chat.completions.create = AsyncMock(return_value=mock_chat_response)
        
        await service.chat([{"role": "user", "content": "test"}])
        call_kwargs = service.client.chat.completions.create.call_args[1]
        assert call_kwargs["extra_body"] == {"enable_thinking": False}

    @pytest.mark.asyncio
    async def test_chat_thinking_mode_enabled(self, service, mock_chat_response):
        service.client.chat.completions.create = AsyncMock(return_value=mock_chat_response)
        
        await service.chat([{"role": "user", "content": "test"}], enable_thinking=True)
        call_kwargs = service.client.chat.completions.create.call_args[1]
        assert call_kwargs["extra_body"] == {"enable_thinking": True}


# ═══════════════════════════════════════════
# chat_stream 方法测试
# ═══════════════════════════════════════════

class TestChatStream:
    """流式对话"""

    @pytest.mark.asyncio
    async def test_chat_stream_yields_content(self, service, mock_stream_chunks):
        async def mock_stream():
            for chunk in mock_stream_chunks:
                yield chunk

        service.client.chat.completions.create = AsyncMock(return_value=mock_stream())
        
        results = []
        async for text in service.chat_stream([{"role": "user", "content": "test"}]):
            results.append(text)
        
        assert results == ["Hello", " World", "!"]

    @pytest.mark.asyncio
    async def test_chat_stream_skips_none_content(self, service):
        """None content 的 chunk 应被跳过"""
        chunks = []
        for text in [None, "data", None]:
            chunk = MagicMock()
            chunk.choices = [MagicMock()]
            chunk.choices[0].delta.content = text
            chunks.append(chunk)

        async def mock_stream():
            for chunk in chunks:
                yield chunk

        service.client.chat.completions.create = AsyncMock(return_value=mock_stream())
        
        results = []
        async for text in service.chat_stream([{"role": "user", "content": "test"}]):
            results.append(text)
        
        assert results == ["data"]

    @pytest.mark.asyncio
    async def test_chat_stream_uses_correct_params(self, service):
        async def mock_stream():
            return
            yield  # noqa

        service.client.chat.completions.create = AsyncMock(return_value=mock_stream())
        
        async for _ in service.chat_stream([{"role": "user", "content": "test"}]):
            pass
        
        call_kwargs = service.client.chat.completions.create.call_args[1]
        assert call_kwargs["stream"] is True
        assert call_kwargs["extra_body"] == {"enable_thinking": False}


# ═══════════════════════════════════════════
# 业务便捷方法测试
# ═══════════════════════════════════════════

class TestBusinessMethods:
    """各业务方法的 prompt 拼接与调用"""

    @pytest.mark.asyncio
    async def test_analyze_trends_uses_correct_prompt(self, service, mock_chat_response):
        service.client.chat.completions.create = AsyncMock(return_value=mock_chat_response)
        
        result = await service.analyze_trends("raw data here", mode="realtime")
        assert result == "mock response content"
        
        call_kwargs = service.client.chat.completions.create.call_args[1]
        messages = call_kwargs["messages"]
        assert messages[0]["role"] == "system"
        assert messages[1]["role"] == "user"
        assert messages[1]["content"] == "raw data here"

    @pytest.mark.asyncio
    async def test_analyze_trends_fallback_prompt(self, service, mock_chat_response):
        """无效 mode 应回退到 prophet_analyze"""
        service.client.chat.completions.create = AsyncMock(return_value=mock_chat_response)
        
        await service.analyze_trends("data", mode="nonexistent")
        call_kwargs = service.client.chat.completions.create.call_args[1]
        messages = call_kwargs["messages"]
        # 应使用 prophet_analyze 模板
        assert len(messages[0]["content"]) > 0

    @pytest.mark.asyncio
    async def test_generate_characters(self, service, mock_chat_response):
        service.client.chat.completions.create = AsyncMock(return_value=mock_chat_response)
        
        result = await service.generate_characters("都市悬疑短剧")
        assert result == "mock response content"
        
        call_kwargs = service.client.chat.completions.create.call_args[1]
        messages = call_kwargs["messages"]
        assert "都市悬疑短剧" in messages[1]["content"]
        assert "3 个最核心角色" in messages[1]["content"]

    @pytest.mark.asyncio
    async def test_generate_voice_desc(self, service, mock_chat_response):
        service.client.chat.completions.create = AsyncMock(return_value=mock_chat_response)
        
        await service.generate_voice_desc("冷酷男主，30岁")
        call_kwargs = service.client.chat.completions.create.call_args[1]
        messages = call_kwargs["messages"]
        assert "冷酷男主，30岁" in messages[1]["content"]

    @pytest.mark.asyncio
    async def test_design_decisions(self, service, mock_chat_response):
        service.client.chat.completions.create = AsyncMock(return_value=mock_chat_response)
        
        await service.design_decisions("大纲内容")
        call_kwargs = service.client.chat.completions.create.call_args[1]
        assert call_kwargs["max_tokens"] == 4000
        messages = call_kwargs["messages"]
        assert messages[1]["content"] == "大纲内容"

    @pytest.mark.asyncio
    async def test_continue_script_stream(self, service, mock_stream_chunks):
        async def mock_stream():
            for chunk in mock_stream_chunks:
                yield chunk

        service.client.chat.completions.create = AsyncMock(return_value=mock_stream())
        
        results = []
        async for text in service.continue_script_stream(
            context="之前的剧本",
            characters="角色A",
            mood="紧张",
            instruction="加入反转"
        ):
            results.append(text)
        
        assert results == ["Hello", " World", "!"]
        call_kwargs = service.client.chat.completions.create.call_args[1]
        messages = call_kwargs["messages"]
        assert "之前的剧本" in messages[1]["content"]
        assert "角色A" in messages[1]["content"]
        assert "紧张" in messages[1]["content"]
        assert "加入反转" in messages[1]["content"]

    @pytest.mark.asyncio
    async def test_continue_script_stream_default_instruction(self, service, mock_stream_chunks):
        async def mock_stream():
            for chunk in mock_stream_chunks:
                yield chunk

        service.client.chat.completions.create = AsyncMock(return_value=mock_stream())
        
        async for _ in service.continue_script_stream("ctx", "chars", "mood"):
            pass
        
        call_kwargs = service.client.chat.completions.create.call_args[1]
        messages = call_kwargs["messages"]
        assert "请根据剧情自然续写" in messages[1]["content"]

    @pytest.mark.asyncio
    async def test_generate_outline(self, service, mock_chat_response):
        service.client.chat.completions.create = AsyncMock(return_value=mock_chat_response)
        
        await service.generate_outline("科幻概念", keywords="AI,末日", characters="机器人主角")
        call_kwargs = service.client.chat.completions.create.call_args[1]
        assert call_kwargs["max_tokens"] == 6000
        messages = call_kwargs["messages"]
        assert "科幻概念" in messages[1]["content"]
        assert "AI,末日" in messages[1]["content"]
        assert "机器人主角" in messages[1]["content"]

    @pytest.mark.asyncio
    async def test_generate_outline_defaults(self, service, mock_chat_response):
        service.client.chat.completions.create = AsyncMock(return_value=mock_chat_response)
        
        await service.generate_outline("概念")
        call_kwargs = service.client.chat.completions.create.call_args[1]
        messages = call_kwargs["messages"]
        assert "无" in messages[1]["content"]  # keywords default
        assert "待生成" in messages[1]["content"]  # characters default

    @pytest.mark.asyncio
    async def test_simulate_decision(self, service, mock_stream_chunks):
        async def mock_stream():
            for chunk in mock_stream_chunks:
                yield chunk

        service.client.chat.completions.create = AsyncMock(return_value=mock_stream())
        
        results = []
        async for text in service.simulate_decision("生死抉择", "选A"):
            results.append(text)
        
        assert len(results) > 0
        call_kwargs = service.client.chat.completions.create.call_args[1]
        messages = call_kwargs["messages"]
        assert "生死抉择" in messages[1]["content"]
        assert "选A" in messages[1]["content"]

    @pytest.mark.asyncio
    async def test_generate_hotspots(self, service, mock_chat_response):
        service.client.chat.completions.create = AsyncMock(return_value=mock_chat_response)
        
        await service.generate_hotspots("都市悬疑", episode_num=3)
        call_kwargs = service.client.chat.completions.create.call_args[1]
        messages = call_kwargs["messages"]
        assert "都市悬疑" in messages[1]["content"]
        assert "第3集" in messages[1]["content"]

    @pytest.mark.asyncio
    async def test_generate_video_scripts(self, service, mock_chat_response):
        service.client.chat.completions.create = AsyncMock(return_value=mock_chat_response)
        
        await service.generate_video_scripts(2, "热点数据", "A方向60%")
        call_kwargs = service.client.chat.completions.create.call_args[1]
        messages = call_kwargs["messages"]
        assert "第2集" in messages[1]["content"]
        assert "热点数据" in messages[1]["content"]
        assert "A方向60%" in messages[1]["content"]
        assert call_kwargs["max_tokens"] == 6000

    @pytest.mark.asyncio
    async def test_parse_script_text(self, service, mock_chat_response):
        service.client.chat.completions.create = AsyncMock(return_value=mock_chat_response)
        
        await service.parse_script_text("原始剧本文本")
        call_kwargs = service.client.chat.completions.create.call_args[1]
        messages = call_kwargs["messages"]
        assert messages[1]["content"] == "原始剧本文本"
        assert call_kwargs["max_tokens"] == 4000


# ═══════════════════════════════════════════
# 全局单例测试
# ═══════════════════════════════════════════

class TestGlobalSingleton:
    """全局 qwen_service 单例"""

    def test_singleton_exists(self):
        assert qwen_service is not None
        assert isinstance(qwen_service, QwenService)
