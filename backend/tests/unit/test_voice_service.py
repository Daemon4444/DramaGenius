"""
U5: Voice 服务单元测试
覆盖: tone_to_voice_id, synthesize_to_bytes, create_cloned_voice
"""
import pytest
from unittest.mock import patch, MagicMock

from app.services.voice_service import VoiceService, voice_service, VOICE_TONE_MAP


# ═══════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════

@pytest.fixture
def service():
    svc = VoiceService()
    svc.api_key = "test-key"
    return svc


@pytest.fixture
def service_no_key():
    svc = VoiceService()
    svc.api_key = ""
    return svc


# ═══════════════════════════════════════════
# tone_to_voice_id 测试
# ═══════════════════════════════════════════

class TestToneToVoiceId:
    """音色描述 -> voice ID 映射"""

    def test_known_tone_qingleng(self):
        svc = VoiceService()
        assert svc.tone_to_voice_id("清冷") == "longxiaochun_v2"

    def test_known_tone_wennuan(self):
        svc = VoiceService()
        assert svc.tone_to_voice_id("温暖") == "longwan_v2"

    def test_known_tone_dichen(self):
        svc = VoiceService()
        assert svc.tone_to_voice_id("低沉") == "longcheng_v2"

    def test_known_tone_chenwen(self):
        svc = VoiceService()
        assert svc.tone_to_voice_id("沉稳") == "longcheng_v2"

    def test_known_tone_jianrui(self):
        svc = VoiceService()
        assert svc.tone_to_voice_id("尖锐") == "longhua_v2"

    def test_known_tone_yinleng(self):
        svc = VoiceService()
        assert svc.tone_to_voice_id("阴冷") == "longhua_v2"

    def test_known_tone_huopo(self):
        svc = VoiceService()
        assert svc.tone_to_voice_id("活泼") == "longyuan_v2"

    def test_default_female(self):
        svc = VoiceService()
        assert svc.tone_to_voice_id("default_female") == "longxiaochun_v2"

    def test_default_male(self):
        svc = VoiceService()
        assert svc.tone_to_voice_id("default_male") == "longcheng_v2"

    def test_unknown_tone_returns_default(self):
        svc = VoiceService()
        assert svc.tone_to_voice_id("不存在的音色") == "longxiaochun_v2"

    def test_empty_tone_returns_default(self):
        svc = VoiceService()
        assert svc.tone_to_voice_id("") == "longxiaochun_v2"

    def test_all_map_entries_are_valid(self):
        """所有映射值都是非空字符串"""
        for tone, voice_id in VOICE_TONE_MAP.items():
            assert isinstance(voice_id, str)
            assert len(voice_id) > 0


# ═══════════════════════════════════════════
# synthesize_to_bytes 测试
# ═══════════════════════════════════════════

class TestSynthesizeToBytes:
    """TTS 合成"""

    @pytest.mark.asyncio
    async def test_no_api_key_returns_none(self, service_no_key):
        result = await service_no_key.synthesize_to_bytes("hello")
        assert result is None

    @pytest.mark.asyncio
    async def test_synthesis_success(self, service):
        """成功合成返回 bytes"""
        fake_audio = b"\xff\xfb\x90\x00" * 100  # fake MP3 bytes

        with patch.object(service, '_synthesize_sync', return_value=fake_audio):
            result = await service.synthesize_to_bytes("测试文本")
        
        assert result == fake_audio

    @pytest.mark.asyncio
    async def test_synthesis_returns_none_on_empty(self, service):
        """合成返回空 bytes 时返回 None"""
        with patch.object(service, '_synthesize_sync', return_value=None):
            result = await service.synthesize_to_bytes("test")
        
        assert result is None

    @pytest.mark.asyncio
    async def test_synthesis_exception_returns_none(self, service):
        """合成异常时返回 None 而非抛出"""
        with patch.object(service, '_synthesize_sync', side_effect=RuntimeError("SDK error")):
            result = await service.synthesize_to_bytes("test")
        
        assert result is None

    @pytest.mark.asyncio
    async def test_synthesis_passes_params(self, service):
        """参数正确传递"""
        with patch.object(service, '_synthesize_sync', return_value=b"audio") as mock_sync:
            await service.synthesize_to_bytes(
                text="你好",
                voice="longcheng_v2",
                speech_rate=1.5,
                pitch_rate=0.8,
            )
        
        mock_sync.assert_called_once_with("你好", "longcheng_v2", 1.5, 0.8)


# ═══════════════════════════════════════════
# create_cloned_voice 测试
# ═══════════════════════════════════════════

class TestCreateClonedVoice:
    """声音克隆"""

    @pytest.mark.asyncio
    async def test_no_api_key_returns_none(self, service_no_key):
        result = await service_no_key.create_cloned_voice("http://example.com/audio.mp3")
        assert result is None

    @pytest.mark.asyncio
    async def test_clone_success(self, service):
        with patch.object(service, '_create_cloned_voice_sync', return_value="dg_cloned_voice_123"):
            result = await service.create_cloned_voice(
                audio_url="http://example.com/ref.mp3",
                prefix="dg",
            )
        
        assert result == "dg_cloned_voice_123"

    @pytest.mark.asyncio
    async def test_clone_exception_returns_none(self, service):
        with patch.object(service, '_create_cloned_voice_sync', side_effect=Exception("clone failed")):
            result = await service.create_cloned_voice("http://example.com/audio.mp3")
        
        assert result is None

    @pytest.mark.asyncio
    async def test_clone_passes_params(self, service):
        with patch.object(service, '_create_cloned_voice_sync', return_value="voice-id") as mock_sync:
            await service.create_cloned_voice(
                audio_url="http://cdn.example.com/voice.wav",
                prefix="test",
                target_model="cosyvoice-v2",
            )
        
        mock_sync.assert_called_once_with(
            "http://cdn.example.com/voice.wav",
            "test",
            "cosyvoice-v2",
        )


# ═══════════════════════════════════════════
# Legacy synthesize 测试
# ═══════════════════════════════════════════

class TestLegacySynthesize:
    """旧接口兼容"""

    @pytest.mark.asyncio
    async def test_legacy_returns_none(self, service):
        result = await service.synthesize("hello", "清冷女声")
        assert result is None


# ═══════════════════════════════════════════
# 全局单例
# ═══════════════════════════════════════════

class TestVoiceServiceSingleton:
    def test_singleton_exists(self):
        assert voice_service is not None
        assert isinstance(voice_service, VoiceService)
