"""
Producer 视频制片服务层
管理热点采集、剧本生成、视频制作流程
"""
import json
import asyncio
import re
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.producer import (
    Hotspot, VideoScript, AudienceInteraction, AudienceVote,
    AudienceComment, VideoProduction, StorylineNode, StorylineEdge,
)
from app.services.llm_service import qwen_service
from app.config import get_settings

_settings = get_settings()


async def _safe_flush(db: AsyncSession):
    """安全 flush：失败时 rollback 保证 session 可继续使用"""
    try:
        await db.flush()
    except Exception:
        try:
            await db.rollback()
        except Exception:
            pass


def _db_available() -> bool:
    """判断是否启用数据库"""
    return not _settings.DEV_SKIP_DB


class ProducerService:
    """视频制片核心服务"""

    def _parse_json_from_llm(self, text: str) -> dict:
        """从 LLM 输出中提取 JSON"""
        try:
            if "```json" in text:
                json_str = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                json_str = text.split("```")[1].split("```")[0].strip()
            else:
                json_str = text
            return json.loads(json_str)
        except (json.JSONDecodeError, IndexError):
            return {}

    # ── 热点 ──

    async def generate_hotspots_for_episode(
        self, db: AsyncSession, project_id: str, episode_key: str, concept: str
    ) -> list[dict]:
        """AI 生成指定集的热点数据"""
        ep_num = int(re.search(r'\d+', episode_key).group()) if re.search(r'\d+', episode_key) else 1
        result_str = await qwen_service.generate_hotspots(concept, ep_num)
        data = self._parse_json_from_llm(result_str)
        items = data.get("items", [])

        if _db_available():
            for item in items:
                db.add(Hotspot(
                    project_id=project_id,
                    episode_key=episode_key,
                    tag=item.get("tag", ""),
                    heat=item.get("heat", 0),
                    trend=item.get("trend", []),
                    analysis=item.get("analysis", ""),
                    ai_suggestion=item.get("aiSuggestion", ""),
                    is_new=item.get("isNew", False),
                ))
            await _safe_flush(db)

        return items

    # ── 剧本 ──

    async def generate_scripts(
        self, db: AsyncSession, project_id: str, episode_num: int,
        hotspots_summary: str, vote_result: str
    ) -> dict:
        """AI 生成 A/B 分支视频剧本"""
        result_str = await qwen_service.generate_video_scripts(
            episode_num, hotspots_summary, vote_result
        )
        data = self._parse_json_from_llm(result_str)

        scripts = {}
        for branch_key in ("scriptA", "scriptB"):
            branch_data = data.get(branch_key)
            if not branch_data:
                continue
            branch_letter = branch_key[-1]
            script_key = f"ep{episode_num}{branch_letter.lower()}"

            if _db_available():
                db.add(VideoScript(
                    project_id=project_id,
                    script_key=script_key,
                    title=branch_data.get("title", f"第{episode_num}集{branch_letter}"),
                    episode=episode_num,
                    branch=branch_letter,
                    status="generated",
                    summary=branch_data.get("summary"),
                    roles=branch_data.get("roles", []),
                    scenes=branch_data.get("scenes", []),
                ))
            scripts[branch_key] = branch_data

        if _db_available():
            await _safe_flush(db)
        return scripts

    async def parse_script_from_text(
        self, db: AsyncSession, project_id: str, script_key: str,
        title: str, episode: int, branch: Optional[str], raw_text: str
    ) -> dict:
        """解析文本格式剧本并存入数据库"""
        result_str = await qwen_service.parse_script_text(raw_text)
        data = self._parse_json_from_llm(result_str)

        import uuid
        fake_id = str(uuid.uuid4())

        if _db_available():
            script = VideoScript(
                project_id=project_id,
                script_key=script_key,
                title=title,
                episode=episode,
                branch=branch,
                status="published",
                summary=data.get("summary"),
                roles=data.get("roles", []),
                scenes=data.get("scenes", []),
                source_text=raw_text,
            )
            db.add(script)
            await _safe_flush(db)
            fake_id = str(script.id)

        return {
            "id": fake_id,
            "script_key": script_key,
            "title": title,
            "summary": data.get("summary"),
            "roles": data.get("roles", []),
            "scenes": data.get("scenes", []),
        }

    # ── 视频制作 ──

    async def start_production(
        self, db: AsyncSession, project_id: str, script_id: str,
        style: str, voice: str, bgm: str
    ) -> dict:
        """启动视频制作任务"""
        import time
        task_id = f"task_{int(time.time() * 1000)}"
        import uuid
        prod_id = str(uuid.uuid4())

        if _db_available():
            production = VideoProduction(
                project_id=project_id,
                script_id=script_id,
                style=style,
                voice=voice,
                bgm=bgm,
                status="producing",
                progress=0,
                current_step="parse",
                task_id=task_id,
            )
            db.add(production)
            await _safe_flush(db)
            prod_id = str(production.id)
            task_id = production.task_id

        return {"id": prod_id, "task_id": task_id, "status": "producing"}

    async def update_production_progress(
        self, db: AsyncSession, production_id: str, step: str, progress: int
    ):
        """更新视频制作进度"""
        if not _db_available():
            return
        try:
            result = await db.execute(
                select(VideoProduction).where(VideoProduction.id == production_id)
            )
            production = result.scalar_one_or_none()
            if production:
                production.current_step = step
                production.progress = progress
                if progress >= 100:
                    production.status = "done"
                await _safe_flush(db)
        except Exception:
            pass

    # ── 互动 ──

    async def cast_vote(
        self, db: AsyncSession, interaction_id: str, choice: str, user_id: Optional[str] = None
    ) -> dict:
        """投票"""
        if not _db_available():
            return {"success": True, "choice": choice}
        try:
            result = await db.execute(
                select(AudienceInteraction).where(AudienceInteraction.id == interaction_id)
            )
            interaction = result.scalar_one_or_none()
            if not interaction:
                return {"success": False, "error": "互动不存在"}
            if interaction.status != "open":
                return {"success": False, "error": "投票已关闭"}
            db.add(AudienceVote(interaction_id=interaction_id, user_id=user_id, choice=choice))
            if choice == "A":
                interaction.option_a["votes"] = interaction.option_a.get("votes", 0) + 1
            else:
                interaction.option_b["votes"] = interaction.option_b.get("votes", 0) + 1
            await _safe_flush(db)
        except Exception:
            pass
        return {"success": True, "choice": choice}

    async def add_comment(
        self, db: AsyncSession, interaction_id: str, user_name: str, text: str
    ) -> dict:
        """添加弹幕/评论"""
        import datetime
        now = datetime.datetime.utcnow()
        if _db_available():
            comment = AudienceComment(
                interaction_id=interaction_id, user_name=user_name, text=text,
            )
            db.add(comment)
            await _safe_flush(db)
            now = comment.created_at
        return {
            "id": str(__import__('uuid').uuid4()),
            "user_name": user_name,
            "text": text,
            "created_at": now.isoformat(),
        }

    # ── 图谱 ──

    async def init_storyline(self, db: AsyncSession, project_id: str, nodes: list, edges: list):
        """初始化分支图谱"""
        if not _db_available():
            return
        for node_data in nodes:
            db.add(StorylineNode(
                project_id=project_id,
                node_key=node_data["id"],
                title=node_data["title"],
                subtitle=node_data.get("subtitle"),
                tags=node_data.get("tags", []),
                status=node_data.get("status", "upcoming"),
                date=node_data.get("date"),
                x=node_data.get("x", 50),
                y=node_data.get("y", 50),
                video_url=node_data.get("videoUrl"),
            ))
        for edge_data in edges:
            db.add(StorylineEdge(
                project_id=project_id,
                from_node=edge_data["from"],
                to_node=edge_data["to"],
                label=edge_data.get("label"),
            ))
        await _safe_flush(db)


# 全局单例
producer_service = ProducerService()
