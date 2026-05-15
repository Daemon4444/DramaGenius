"""
通义千问 LLM 统一服务层
通过百炼 OpenAI 兼容接口调用 Qwen 系列模型
支持普通对话、流式输出
"""
import asyncio
from typing import AsyncGenerator
from openai import AsyncOpenAI
from app.config import get_settings
from app.services.prompts import PROMPT_TEMPLATES

settings = get_settings()

class QwenService:
    """
    通义千问统一服务 (百炼 OpenAI 兼容模式)
    当前模型: qwen3.5-plus（默认关闭 thinking 模式以提升响应速度）
    """

    def __init__(self):
        self._client = None

    @property
    def client(self) -> AsyncOpenAI:
        """懒初始化客户端"""
        if self._client is None:
            self._client = AsyncOpenAI(
                api_key=settings.DASHSCOPE_API_KEY,
                base_url=settings.BAILIAN_BASE_URL,
                timeout=60.0,
            )
        return self._client

    # ── 普通对话 (非流式) ──
    async def chat(
        self,
        messages: list[dict],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        enable_thinking: bool = False,  # Qwen3 thinking 模式，默认关闭提速
    ) -> str:
        """调用千问，返回完整文本"""
        model = model or settings.QWEN_MODEL_MAX
        # Qwen3 系列通过 extra_body 控制 thinking 模式
        extra_body = {"enable_thinking": enable_thinking}
        response = await self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            extra_body=extra_body,
        )
        return response.choices[0].message.content

    # ── 流式对话 (SSE) ──
    async def chat_stream(
        self,
        messages: list[dict],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 4000,
    ) -> AsyncGenerator[str, None]:
        """流式调用千问，逐 chunk 返回文本（关闭 thinking 模式）"""
        model = model or settings.QWEN_MODEL_MAX
        stream = await self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
            extra_body={"enable_thinking": False},
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    # ── 带 Prompt 模板的便捷方法 ──

    async def analyze_trends(self, raw_data: str) -> str:
        """Prophet: 舆情分析"""
        messages = [
            {"role": "system", "content": PROMPT_TEMPLATES["prophet_analyze"]},
            {"role": "user", "content": raw_data},
        ]
        return await self.chat(messages, model=settings.QWEN_MODEL_PLUS, max_tokens=2000)

    async def generate_characters(self, concept: str) -> str:
        """Soul: 角色生成（轻量版，生成 3 个核心角色）"""
        messages = [
            {"role": "system", "content": PROMPT_TEMPLATES["soul_character"]},
            {"role": "user", "content": f"{concept}\n\n注意：仅生成 3 个最核心角色，每个角色 backstory 不超过 80 字。"},
        ]
        return await self.chat(messages, model=settings.QWEN_MODEL_PLUS, max_tokens=2000)

    async def generate_voice_desc(self, character_profile: str) -> str:
        """Soul: 生成声音描述"""
        messages = [
            {"role": "system", "content": PROMPT_TEMPLATES["soul_voice_desc"]},
            {"role": "user", "content": character_profile},
        ]
        return await self.chat(messages, model=settings.QWEN_MODEL_TURBO)

    async def design_decisions(self, outline: str) -> str:
        """Arbiter: 决策点设计"""
        messages = [
            {"role": "system", "content": PROMPT_TEMPLATES["arbiter_decision"]},
            {"role": "user", "content": outline},
        ]
        return await self.chat(messages, model=settings.QWEN_MODEL_PLUS, max_tokens=4000)

    async def continue_script_stream(
        self, context: str, characters: str, mood: str, instruction: str = ""
    ) -> AsyncGenerator[str, None]:
        """Workspace: 流式续写剧本"""
        user_content = f"""## 已有剧本上下文
{context}

## 角色档案
{characters}

## 当前场景氛围
{mood}

## 用户指导
{instruction or '请根据剧情自然续写'}"""

        messages = [
            {"role": "system", "content": PROMPT_TEMPLATES["workspace_continue"]},
            {"role": "user", "content": user_content},
        ]
        async for chunk in self.chat_stream(messages, model=settings.QWEN_MODEL_MAX):
            yield chunk

    async def generate_outline(self, concept: str, keywords: str = "", characters: str = "") -> str:
        """Workspace: 生成剧集大纲"""
        user_content = f"""## 创作概念
{concept}

## 热门关键词参考
{keywords or '无'}

## 角色设定参考
{characters or '待生成'}"""

        messages = [
            {"role": "system", "content": PROMPT_TEMPLATES["workspace_outline"]},
            {"role": "user", "content": user_content},
        ]
        return await self.chat(messages, model=settings.QWEN_MODEL_MAX, max_tokens=6000)

    async def simulate_decision(self, decision_desc: str, choice: str) -> AsyncGenerator[str, None]:
        """Arbiter: 模拟决策走向"""
        messages = [
            {"role": "system", "content": PROMPT_TEMPLATES["arbiter_simulate"]},
            {"role": "user", "content": f"决策点: {decision_desc}\n用户选择: {choice}\n\n请模拟这个选择后的剧情走向:"},
        ]
        async for chunk in self.chat_stream(messages, model=settings.QWEN_MODEL_PLUS):
            yield chunk

    async def generate_hotspots(self, concept: str, episode_num: int) -> str:
        """Producer: 生成热点分析"""
        messages = [
            {"role": "system", "content": PROMPT_TEMPLATES["producer_hotspot_analyze"]},
            {"role": "user", "content": f"剧集主题: {concept}\n当前集数: 第{episode_num}集\n\n请生成与本集相关的社交媒体热点分析"},
        ]
        return await self.chat(messages, model=settings.QWEN_MODEL_PLUS)

    async def generate_video_scripts(self, episode_num: int, hotspots: str, vote_result: str) -> str:
        """Producer: 生成分支视频剧本"""
        messages = [
            {"role": "system", "content": PROMPT_TEMPLATES["producer_script_generate"]},
            {"role": "user", "content": f"集数: 第{episode_num}集\n\n热点数据:\n{hotspots}\n\n观众投票结果:\n{vote_result}\n\n请生成本集的 A/B 两个分支分镜脚本"},
        ]
        return await self.chat(messages, model=settings.QWEN_MODEL_MAX, max_tokens=6000)

    async def parse_script_text(self, raw_text: str) -> str:
        """Producer: 解析文本格式剧本为结构化 JSON"""
        messages = [
            {"role": "system", "content": PROMPT_TEMPLATES["producer_script_parse"]},
            {"role": "user", "content": raw_text},
        ]
        return await self.chat(messages, model=settings.QWEN_MODEL_PLUS, max_tokens=4000)


# 全局单例
qwen_service = QwenService()
