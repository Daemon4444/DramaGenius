"""
语音合成服务
使用 DashScope CosyVoice v2 API 生成角色语音，支持声音克隆
"""
import asyncio
import os
from typing import Optional
from app.config import get_settings

settings = get_settings()

# CosyVoice v2 预置音色 ID 映射
VOICE_TONE_MAP = {
    "清冷": "longxiaochun_v2",   # 专业女声，偏清冷
    "温暖": "longwan_v2",        # 温柔女声（替代不可用的 longxiaoya_v2）
    "低沉": "longcheng_v2",      # 磁性男声
    "沉稳": "longcheng_v2",
    "尖锐": "longhua_v2",        # 尖锐女声
    "阴冷": "longhua_v2",
    "活泼": "longyuan_v2",       # 活泼女声
    "default_female": "longxiaochun_v2",
    "default_male": "longcheng_v2",
    "default": "longxiaochun_v2",
}


class VoiceService:
    """CosyVoice v2 语音合成服务"""

    def __init__(self):
        self.api_key = settings.DASHSCOPE_API_KEY or settings.COSYVOICE_API_KEY
        self.model = "cosyvoice-v2"

    def _get_synthesizer(self, voice: str, speech_rate: float = 1.0, pitch_rate: float = 1.0):
        """创建 SpeechSynthesizer 实例（同步）"""
        from dashscope.audio.tts_v2 import SpeechSynthesizer, AudioFormat
        import dashscope
        dashscope.api_key = self.api_key
        return SpeechSynthesizer(
            model=self.model,
            voice=voice,
            format=AudioFormat.MP3_22050HZ_MONO_256KBPS,
            speech_rate=speech_rate,
            pitch_rate=pitch_rate,
        )

    async def synthesize_to_bytes(
        self,
        text: str,
        voice: str = "longxiaochun_v2",
        speech_rate: float = 1.0,
        pitch_rate: float = 1.0,
    ) -> Optional[bytes]:
        """
        合成语音并返回 MP3 字节流

        参数:
            text: 要合成的文本
            voice: CosyVoice v2 音色 ID（如 longxiaochun_v2）
            speech_rate: 语速倍率（0.5–2.0）
            pitch_rate: 音调倍率（0.5–2.0）
        返回:
            MP3 音频字节流，失败返回 None
        """
        if not self.api_key:
            return None

        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                self._synthesize_sync,
                text, voice, speech_rate, pitch_rate
            )
            return result
        except Exception as e:
            print(f"[VoiceService] 语音合成失败: {e}")
            return None

    def _synthesize_sync(
        self,
        text: str,
        voice: str,
        speech_rate: float,
        pitch_rate: float,
    ) -> Optional[bytes]:
        """同步合成（在 executor 中运行）"""
        synthesizer = self._get_synthesizer(voice, speech_rate, pitch_rate)
        audio_bytes = synthesizer.call(text)
        return audio_bytes if audio_bytes else None

    def tone_to_voice_id(self, tone: str) -> str:
        """将角色音色描述映射到 CosyVoice 音色 ID"""
        return VOICE_TONE_MAP.get(tone, VOICE_TONE_MAP["default"])

    async def create_cloned_voice(
        self,
        audio_url: str,
        prefix: str = "dg",
        target_model: str = "cosyvoice-v2",
    ) -> Optional[str]:
        """
        基于参考音频创建克隆音色

        参数:
            audio_url: 参考音频的公开 URL（DashScope 需能访问）
            prefix: 音色 ID 前缀（仅小写字母和数字，最多 10 字符）
            target_model: 目标合成模型
        返回:
            voice_id，失败返回 None
        """
        if not self.api_key:
            return None

        try:
            loop = asyncio.get_event_loop()
            voice_id = await loop.run_in_executor(
                None,
                self._create_cloned_voice_sync,
                audio_url, prefix, target_model
            )
            return voice_id
        except Exception as e:
            print(f"[VoiceService] 声音克隆失败: {e}")
            return None

    def _create_cloned_voice_sync(
        self,
        audio_url: str,
        prefix: str,
        target_model: str,
    ) -> Optional[str]:
        """同步声音克隆（在 executor 中运行）"""
        from dashscope.audio.tts_v2 import VoiceEnrollmentService
        import dashscope
        dashscope.api_key = self.api_key

        service = VoiceEnrollmentService(model="voice-enrollment")
        voice_id = service.create_voice(
            target_model=target_model,
            prefix=prefix,
            url=audio_url,
        )
        return voice_id

    # ── 旧接口保留兼容 ──
    async def synthesize(
        self,
        text: str,
        voice_desc: str,
        character_name: str = "default"
    ) -> Optional[str]:
        """Legacy: 返回音频 URL（当前直接合成字节流，不上传 OSS，返回 None）"""
        return None


# 全局单例
voice_service = VoiceService()
