"""
I15-I19: Soul 接口集成测试
覆盖: generate, generate-dialogue, project characters, voice-preview, tts, voice-clone, memory/query
"""
import json
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.utils.auth import create_access_token


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def auth_headers():
    token = create_access_token("test-user-123")
    return {"Authorization": f"Bearer {token}"}


# ═══════════════════════════════════════════
# POST /api/soul/generate
# ═══════════════════════════════════════════

class TestGenerateCharacters:
    """角色生成"""

    @pytest.mark.asyncio
    async def test_generate_success(self, client, auth_headers):
        """Demo 模式正常生成"""
        llm_data = json.dumps({
            "characters": [
                {"name": "陆言", "role": "protagonist", "personality": ["冷静"]},
                {"name": "苏晚", "role": "antagonist", "personality": ["狡猾"]},
            ],
            "chemistry": [{"pair": ["陆言", "苏晚"], "type": "rivalry"}]
        })
        
        with patch("app.routers.soul.qwen_service") as mock_qwen:
            mock_qwen.generate_characters = AsyncMock(return_value=f"```json\n{llm_data}\n```")
            response = await client.post("/api/soul/generate", json={
                "concept": "都市悬疑"
            }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "characters" in data
        assert len(data["characters"]) == 2
        assert data["characters"][0]["name"] == "陆言"

    @pytest.mark.asyncio
    async def test_generate_missing_concept(self, client, auth_headers):
        """缺少 concept -> 422"""
        response = await client.post("/api/soul/generate", json={}, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_generate_llm_invalid_json(self, client, auth_headers):
        """LLM 返回无效 JSON -> 500"""
        with patch("app.routers.soul.qwen_service") as mock_qwen:
            mock_qwen.generate_characters = AsyncMock(return_value="totally not json")
            response = await client.post("/api/soul/generate", json={
                "concept": "test"
            }, headers=auth_headers)
        
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_generate_no_auth_works(self, client):
        """无 auth -> 使用 demo 用户，仍可调用"""
        llm_data = json.dumps({"characters": [], "chemistry": []})
        
        with patch("app.routers.soul.qwen_service") as mock_qwen:
            mock_qwen.generate_characters = AsyncMock(return_value=llm_data)
            response = await client.post("/api/soul/generate", json={
                "concept": "科幻"
            })
        
        assert response.status_code == 200


# ═══════════════════════════════════════════
# POST /api/soul/generate-dialogue
# ═══════════════════════════════════════════

class TestGenerateDialogue:
    """台词生成"""

    @pytest.mark.asyncio
    async def test_dialogue_success(self, client):
        """正常生成台词"""
        llm_data = json.dumps({
            "dialogues": [
                {"text": "你以为金钱能买到一切？", "emotion": "冷嘲", "stage_direction": "转身离去"}
            ],
            "style_summary": "冷峻犀利"
        })
        
        with patch("app.routers.soul.qwen_service") as mock_qwen:
            mock_qwen.chat = AsyncMock(return_value=f"```json\n{llm_data}\n```")
            response = await client.post("/api/soul/generate-dialogue", json={
                "character_name": "陆言",
                "personality": "冷静、理性",
                "scene": "商务谈判桌前"
            })
        
        assert response.status_code == 200
        data = response.json()
        assert "dialogues" in data

    @pytest.mark.asyncio
    async def test_dialogue_missing_fields(self, client):
        """缺少必填字段 -> 422"""
        response = await client.post("/api/soul/generate-dialogue", json={
            "character_name": "test"
        })
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_dialogue_llm_non_json_fallback(self, client):
        """LLM 返回非 JSON 时包装为默认格式"""
        with patch("app.routers.soul.qwen_service") as mock_qwen:
            mock_qwen.chat = AsyncMock(return_value="这是一段原始文本回复")
            response = await client.post("/api/soul/generate-dialogue", json={
                "character_name": "角色",
                "personality": "温柔",
                "scene": "公园"
            })
        
        assert response.status_code == 200
        data = response.json()
        assert "dialogues" in data
        assert "style_summary" in data


# ═══════════════════════════════════════════
# GET /api/soul/project/{project_id}
# ═══════════════════════════════════════════

class TestGetProjectCharacters:
    """获取项目角色"""

    @pytest.mark.asyncio
    async def test_get_characters_503_dev_mode(self, client, auth_headers):
        """DEV_SKIP_DB + ALLOW_DEMO_DATA=false -> 503"""
        response = await client.get("/api/soul/project/proj-1", headers=auth_headers)
        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_get_characters_no_auth_401(self, client):
        """需要认证"""
        response = await client.get("/api/soul/project/proj-1")
        assert response.status_code == 401


# ═══════════════════════════════════════════
# POST /api/soul/tts
# ═══════════════════════════════════════════

class TestTTS:
    """文本转语音"""

    @pytest.mark.asyncio
    async def test_tts_success(self, client):
        """正常合成返回 audio/mpeg"""
        fake_audio = b"\xff\xfb\x90\x00" * 50
        
        with patch("app.routers.soul.voice_service") as mock_voice:
            mock_voice.synthesize_to_bytes = AsyncMock(return_value=fake_audio)
            response = await client.post("/api/soul/tts", json={
                "text": "你好世界",
                "voice": "longxiaochun_v2"
            })
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "audio/mpeg"
        assert len(response.content) > 0

    @pytest.mark.asyncio
    async def test_tts_empty_text(self, client):
        """空文本 -> 400"""
        response = await client.post("/api/soul/tts", json={
            "text": "   ",
            "voice": "longxiaochun_v2"
        })
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_tts_synthesis_fails(self, client):
        """合成失败 -> 503"""
        with patch("app.routers.soul.voice_service") as mock_voice:
            mock_voice.synthesize_to_bytes = AsyncMock(return_value=None)
            response = await client.post("/api/soul/tts", json={
                "text": "测试文本"
            })
        
        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_tts_long_text_truncated(self, client):
        """超长文本被截断到 500 字"""
        long_text = "测" * 600
        fake_audio = b"\xff\xfb" * 10
        
        with patch("app.routers.soul.voice_service") as mock_voice:
            mock_voice.synthesize_to_bytes = AsyncMock(return_value=fake_audio)
            response = await client.post("/api/soul/tts", json={
                "text": long_text
            })
        
        assert response.status_code == 200
        # 验证传给 service 的文本被截断
        call_kwargs = mock_voice.synthesize_to_bytes.call_args[1]
        assert len(call_kwargs["text"]) == 500


# ═══════════════════════════════════════════
# POST /api/soul/voice-clone
# ═══════════════════════════════════════════

class TestVoiceClone:
    """声音克隆"""

    @pytest.mark.asyncio
    async def test_clone_audio_too_short(self, client):
        """音频过短 -> 400"""
        short_audio = b"\x00" * 100  # < 5000 bytes
        response = await client.post(
            "/api/soul/voice-clone",
            files={"audio": ("test.mp3", short_audio, "audio/mpeg")},
            data={"prefix": "test"}
        )
        assert response.status_code == 400
        assert "过短" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_clone_audio_too_large(self, client):
        """音频过大 -> 400"""
        large_audio = b"\x00" * (31 * 1024 * 1024)
        response = await client.post(
            "/api/soul/voice-clone",
            files={"audio": ("test.mp3", large_audio, "audio/mpeg")},
            data={"prefix": "test"}
        )
        assert response.status_code == 400
        assert "过大" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_clone_success(self, client):
        """成功克隆"""
        audio_data = b"\xff\xfb\x90\x00" * 2000  # > 5000 bytes
        
        with patch("app.routers.soul.storage_service") as mock_storage:
            mock_storage.upload_bytes = AsyncMock(return_value="https://oss.example.com/audio.mp3")
            with patch("app.routers.soul.voice_service") as mock_voice:
                mock_voice.create_cloned_voice = AsyncMock(return_value="dg_cloned_123")
                response = await client.post(
                    "/api/soul/voice-clone",
                    files={"audio": ("ref.mp3", audio_data, "audio/mpeg")},
                    data={"prefix": "dg"}
                )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["voice_id"] == "dg_cloned_123"

    @pytest.mark.asyncio
    async def test_clone_fails(self, client):
        """克隆失败 -> 502"""
        audio_data = b"\xff\xfb\x90\x00" * 2000
        
        with patch("app.routers.soul.storage_service") as mock_storage:
            mock_storage.upload_bytes = AsyncMock(return_value="https://oss.example.com/audio.mp3")
            with patch("app.routers.soul.voice_service") as mock_voice:
                mock_voice.create_cloned_voice = AsyncMock(return_value=None)
                response = await client.post(
                    "/api/soul/voice-clone",
                    files={"audio": ("ref.mp3", audio_data, "audio/mpeg")},
                    data={"prefix": "dg"}
                )
        
        assert response.status_code == 502


# ═══════════════════════════════════════════
# POST /api/soul/memory/query
# ═══════════════════════════════════════════

class TestMemoryQuery:
    """角色记忆查询"""

    @pytest.mark.asyncio
    async def test_memory_returns_501(self, client):
        """未实现 -> 501"""
        response = await client.post("/api/soul/memory/query", json={
            "character_id": "char-1",
            "context": "当前场景"
        })
        assert response.status_code == 501
