"""
U3: Producer 服务单元测试
覆盖: _parse_json_from_llm, generate_hotspots_for_episode, generate_scripts,
       parse_script_from_text, cast_vote, add_comment, init_storyline
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.producer_service import ProducerService, producer_service


# ═══════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════

@pytest.fixture
def service():
    return ProducerService()


@pytest.fixture
def mock_db():
    """模拟 AsyncSession"""
    db = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    return db


# ═══════════════════════════════════════════
# _parse_json_from_llm 测试
# ═══════════════════════════════════════════

class TestParseJsonFromLlm:
    """从 LLM 输出中提取 JSON"""

    def test_pure_json(self, service):
        text = '{"key": "value"}'
        assert service._parse_json_from_llm(text) == {"key": "value"}

    def test_json_in_code_fence(self, service):
        text = 'Some text\n```json\n{"items": [1, 2]}\n```\nMore text'
        assert service._parse_json_from_llm(text) == {"items": [1, 2]}

    def test_json_in_generic_fence(self, service):
        text = 'Text\n```\n{"data": true}\n```\n'
        assert service._parse_json_from_llm(text) == {"data": True}

    def test_invalid_json_returns_empty_dict(self, service):
        text = "This is not JSON at all"
        assert service._parse_json_from_llm(text) == {}

    def test_malformed_fence_returns_empty(self, service):
        text = "```json\n{invalid json\n```"
        assert service._parse_json_from_llm(text) == {}

    def test_nested_json(self, service):
        data = {"items": [{"tag": "AI", "heat": 95}]}
        text = f"```json\n{json.dumps(data)}\n```"
        assert service._parse_json_from_llm(text) == data

    def test_json_with_think_tag_prefix(self, service):
        """LLM 可能在 JSON 前输出思考内容"""
        text = '<think>thinking...</think>\n```json\n{"result": "ok"}\n```'
        assert service._parse_json_from_llm(text) == {"result": "ok"}

    def test_empty_string(self, service):
        assert service._parse_json_from_llm("") == {}

    def test_json_with_chinese(self, service):
        text = '{"tag": "都市悬疑", "heat": 80}'
        result = service._parse_json_from_llm(text)
        assert result["tag"] == "都市悬疑"


# ═══════════════════════════════════════════
# generate_hotspots_for_episode 测试
# ═══════════════════════════════════════════

class TestGenerateHotspotsForEpisode:
    """AI 热点生成"""

    @pytest.mark.asyncio
    async def test_basic_generation(self, service, mock_db):
        """正常生成热点"""
        llm_response = json.dumps({
            "items": [
                {"tag": "AI觉醒", "heat": 90, "trend": [1,2,3,4,5,6,7,8],
                 "analysis": "分析", "aiSuggestion": "建议", "isNew": True},
            ]
        })
        
        with patch("app.services.producer_service.qwen_service") as mock_qwen:
            mock_qwen.generate_hotspots = AsyncMock(return_value=f"```json\n{llm_response}\n```")
            with patch("app.services.producer_service._db_available", return_value=False):
                result = await service.generate_hotspots_for_episode(
                    mock_db, "proj-1", "ep1", "科幻短剧"
                )
        
        assert len(result) == 1
        assert result[0]["tag"] == "AI觉醒"
        assert result[0]["heat"] == 90

    @pytest.mark.asyncio
    async def test_episode_number_extraction(self, service, mock_db):
        """从 episode_key 中提取集数"""
        with patch("app.services.producer_service.qwen_service") as mock_qwen:
            mock_qwen.generate_hotspots = AsyncMock(return_value='{"items": []}')
            with patch("app.services.producer_service._db_available", return_value=False):
                await service.generate_hotspots_for_episode(
                    mock_db, "proj-1", "ep3", "概念"
                )
            # 验证调用时 episode_num 为 3
            mock_qwen.generate_hotspots.assert_called_once_with("概念", 3)

    @pytest.mark.asyncio
    async def test_episode_key_without_number(self, service, mock_db):
        """episode_key 无数字时默认为 1"""
        with patch("app.services.producer_service.qwen_service") as mock_qwen:
            mock_qwen.generate_hotspots = AsyncMock(return_value='{"items": []}')
            with patch("app.services.producer_service._db_available", return_value=False):
                await service.generate_hotspots_for_episode(
                    mock_db, "proj-1", "pilot", "概念"
                )
            mock_qwen.generate_hotspots.assert_called_once_with("概念", 1)

    @pytest.mark.asyncio
    async def test_llm_returns_invalid_json(self, service, mock_db):
        """LLM 返回无效 JSON 时返回空列表"""
        with patch("app.services.producer_service.qwen_service") as mock_qwen:
            mock_qwen.generate_hotspots = AsyncMock(return_value="invalid response")
            with patch("app.services.producer_service._db_available", return_value=False):
                result = await service.generate_hotspots_for_episode(
                    mock_db, "proj-1", "ep1", "概念"
                )
        assert result == []


# ═══════════════════════════════════════════
# generate_scripts 测试
# ═══════════════════════════════════════════

class TestGenerateScripts:
    """A/B 分支剧本生成"""

    @pytest.mark.asyncio
    async def test_generates_both_branches(self, service, mock_db):
        llm_data = {
            "scriptA": {"title": "第2集A", "summary": "路线A", "roles": ["主角"], "scenes": [{"visual": "场景1"}]},
            "scriptB": {"title": "第2集B", "summary": "路线B", "roles": ["配角"], "scenes": [{"visual": "场景2"}]},
        }
        
        with patch("app.services.producer_service.qwen_service") as mock_qwen:
            mock_qwen.generate_video_scripts = AsyncMock(return_value=f"```json\n{json.dumps(llm_data)}\n```")
            with patch("app.services.producer_service._db_available", return_value=False):
                result = await service.generate_scripts(
                    mock_db, "proj-1", 2, "热点摘要", "A:60%"
                )
        
        assert "scriptA" in result
        assert "scriptB" in result
        assert result["scriptA"]["title"] == "第2集A"
        assert result["scriptB"]["summary"] == "路线B"

    @pytest.mark.asyncio
    async def test_single_branch(self, service, mock_db):
        """只返回一个分支"""
        llm_data = {"scriptA": {"title": "Only A", "summary": "只有A"}}
        
        with patch("app.services.producer_service.qwen_service") as mock_qwen:
            mock_qwen.generate_video_scripts = AsyncMock(return_value=json.dumps(llm_data))
            with patch("app.services.producer_service._db_available", return_value=False):
                result = await service.generate_scripts(
                    mock_db, "proj-1", 1, "", ""
                )
        
        assert "scriptA" in result
        assert "scriptB" not in result

    @pytest.mark.asyncio
    async def test_empty_llm_response(self, service, mock_db):
        with patch("app.services.producer_service.qwen_service") as mock_qwen:
            mock_qwen.generate_video_scripts = AsyncMock(return_value="no json here")
            with patch("app.services.producer_service._db_available", return_value=False):
                result = await service.generate_scripts(
                    mock_db, "proj-1", 1, "", ""
                )
        assert result == {}


# ═══════════════════════════════════════════
# parse_script_from_text 测试
# ═══════════════════════════════════════════

class TestParseScriptFromText:
    """文本剧本解析"""

    @pytest.mark.asyncio
    async def test_parse_success(self, service, mock_db):
        llm_data = {
            "summary": "都市悬疑第一集",
            "roles": ["角色A", "角色B"],
            "scenes": [{"visual": "城市夜景", "dialogue": "对话"}]
        }
        
        with patch("app.services.producer_service.qwen_service") as mock_qwen:
            mock_qwen.parse_script_text = AsyncMock(return_value=json.dumps(llm_data))
            with patch("app.services.producer_service._db_available", return_value=False):
                result = await service.parse_script_from_text(
                    mock_db, "proj-1", "ep1a", "第一集A", 1, "A", "原始文本"
                )
        
        assert result["script_key"] == "ep1a"
        assert result["title"] == "第一集A"
        assert result["summary"] == "都市悬疑第一集"
        assert len(result["roles"]) == 2
        assert len(result["scenes"]) == 1


# ═══════════════════════════════════════════
# cast_vote 测试 (DEV_SKIP_DB mode)
# ═══════════════════════════════════════════

class TestCastVote:
    """投票"""

    @pytest.mark.asyncio
    async def test_skip_db_mode(self, service, mock_db):
        """DEV_SKIP_DB 模式直接返回成功"""
        with patch("app.services.producer_service._db_available", return_value=False):
            result = await service.cast_vote(mock_db, "int-1", "A", "user-1")
        assert result == {"success": True, "choice": "A"}

    @pytest.mark.asyncio
    async def test_skip_db_mode_choice_b(self, service, mock_db):
        with patch("app.services.producer_service._db_available", return_value=False):
            result = await service.cast_vote(mock_db, "int-1", "B")
        assert result == {"success": True, "choice": "B"}


# ═══════════════════════════════════════════
# add_comment 测试
# ═══════════════════════════════════════════

class TestAddComment:
    """弹幕/评论"""

    @pytest.mark.asyncio
    async def test_skip_db_mode(self, service, mock_db):
        with patch("app.services.producer_service._db_available", return_value=False):
            result = await service.add_comment(mock_db, "int-1", "用户A", "好精彩！")
        
        assert result["user_name"] == "用户A"
        assert result["text"] == "好精彩！"
        assert "id" in result
        assert "created_at" in result


# ═══════════════════════════════════════════
# init_storyline 测试
# ═══════════════════════════════════════════

class TestInitStoryline:
    """分支图谱初始化"""

    @pytest.mark.asyncio
    async def test_skip_db_mode_does_nothing(self, service, mock_db):
        """DEV_SKIP_DB 模式不做任何操作"""
        with patch("app.services.producer_service._db_available", return_value=False):
            await service.init_storyline(
                mock_db, "proj-1",
                nodes=[{"id": "ep1", "title": "第一集"}],
                edges=[{"from": "ep1", "to": "ep2a"}]
            )
        mock_db.add.assert_not_called()


# ═══════════════════════════════════════════
# 全局单例
# ═══════════════════════════════════════════

class TestProducerServiceSingleton:
    def test_singleton_exists(self):
        assert producer_service is not None
        assert isinstance(producer_service, ProducerService)
