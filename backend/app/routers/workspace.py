"""
Workspace 创作工作台路由
核心 API: 方案生成、剧本续写、导出
"""
import json
import asyncio
import os
import re
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pathlib import Path
from typing import Any, Optional, List

from app.models.database import get_db
from app.models.project import Project, Character
from app.models.script import Episode, Scene
from app.services.llm_service import qwen_service
from app.utils.auth import get_current_user_id, get_current_user_id_optional
from app.utils.streaming import sse_response, sse_multi_stage_response, format_sse
from app.config import get_settings

router = APIRouter()
settings = get_settings()


def _demo_enabled() -> bool:
    return bool(settings.DEV_SKIP_DB and settings.ALLOW_DEMO_DATA)

# Demo 模式下的内存存储。内置展示项目对所有账号可见；用户新建项目仍按账号隔离。
_DEMO_USER = "00000000-0000-0000-0000-000000000001"
_BUILTIN_PROJECT_IDS = {"proj-fuhua", "demo-proj-002"}
_demo_projects = {
    "proj-fuhua": {
        "id": "proj-fuhua",
        "user_id": _DEMO_USER,
        "title": "浮华陷阱",
        "concept": "都市悬疑互动短剧，破产千金与商业死神的权力博弈",
        "genre": "都市悬疑",
        "status": "completed",
        "created_at": "2026-04-23T12:00:00",
        "characters": [],
        "episodes": [],
    },
    "demo-proj-002": {
        "id": "demo-proj-002",
        "user_id": _DEMO_USER,
        "title": "数字芯尘：意识永生计划",
        "concept": "赛博朋克科幻互动短剧",
        "genre": "科幻",
        "status": "in_progress",
        "created_at": "2026-04-08T10:00:00",
        "characters": [],
        "episodes": [],
    },
}
_demo_scenes = {}


class GeneratePlanRequest(BaseModel):
    concept: str
    project_id: Optional[str] = None  # 可选，如果提供则保存到项目
    genre: Optional[str] = None
    episodes: Optional[int] = 3


class ContinueRequest(BaseModel):
    project_id: str
    episode_id: Optional[str] = None
    episode_number: int = 1
    context_scenes: List[dict] = []  # 已有场景
    characters: List[dict] = []  # 角色档案
    mood: str = "紧张"
    instruction: str = ""  # 用户指导


class ExportRequest(BaseModel):
    project_id: str
    format: str = "docx"  # docx, pdf, fountain, json


class CreateProjectRequest(BaseModel):
    title: str
    concept: str
    genre: Optional[str] = None


class SceneRequest(BaseModel):
    order_idx: int = 0
    scene_type: str = "narration"
    character_id: Optional[str] = None
    character_name: Optional[str] = None
    content: str
    mood: Optional[str] = None
    location: Optional[str] = None
    time_of_day: Optional[str] = None


EXPORT_DIR = Path(__file__).resolve().parents[2] / "static" / "temp" / "exports"
SUPPORTED_EXPORT_FORMATS = {"docx", "pdf", "fountain", "json"}


def _normalize_export_format(raw_format: str) -> str:
    export_format = (raw_format or "docx").lower().strip()
    aliases = {
        "fdx": "fountain",
        "finaldraft": "fountain",
        "final-draft": "fountain",
    }
    export_format = aliases.get(export_format, export_format)
    if export_format not in SUPPORTED_EXPORT_FORMATS:
        allowed = ", ".join(sorted(SUPPORTED_EXPORT_FORMATS))
        raise HTTPException(status_code=400, detail=f"不支持的导出格式: {raw_format}，可选: {allowed}")
    return export_format


def _safe_filename(text: str) -> str:
    slug = re.sub(r"[^\w\u4e00-\u9fff.-]+", "-", text or "project", flags=re.UNICODE)
    slug = slug.strip("-._")[:80]
    return slug or "project"


def _as_iso(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _project_to_payload(project: Any) -> dict:
    if isinstance(project, dict):
        return {
            "id": project.get("id"),
            "title": project.get("title") or "未命名项目",
            "concept": project.get("concept") or "",
            "genre": project.get("genre") or "",
            "logline": project.get("logline") or "",
            "status": project.get("status") or "",
            "outline": project.get("outline") or project.get("outline_json") or {},
            "created_at": project.get("created_at"),
            "characters": project.get("characters") or [],
            "episodes": project.get("episodes") or [],
        }

    episodes = sorted(getattr(project, "episodes", []) or [], key=lambda ep: ep.ep_number)
    return {
        "id": str(project.id),
        "title": project.title,
        "concept": project.concept,
        "genre": project.genre or "",
        "logline": project.logline or "",
        "status": project.status,
        "outline": project.outline_json or {},
        "created_at": _as_iso(project.created_at),
        "characters": [
            {
                "id": str(char.id),
                "name": char.name,
                "role": char.role,
                "personality": char.personality or [],
                "backstory": char.backstory or "",
                "motivation": char.motivation or "",
                "speech_style": char.speech_style or "",
                "signature_line": char.signature_line or "",
                "arc": char.arc or "",
            }
            for char in (getattr(project, "characters", []) or [])
        ],
        "episodes": [
            {
                "id": str(ep.id),
                "ep_number": ep.ep_number,
                "title": ep.title,
                "summary": ep.summary or "",
                "cliffhanger": ep.cliffhanger or "",
                "emotional_arc": ep.emotional_arc or "",
                "duration_minutes": ep.duration_minutes,
                "status": ep.status,
                "word_count": ep.word_count,
                "scenes": [
                    {
                        "order_idx": scene.order_idx,
                        "scene_type": scene.scene_type,
                        "character_name": scene.character_name or "",
                        "content": scene.content,
                        "mood": scene.mood or "",
                        "location": scene.location or "",
                        "time_of_day": scene.time_of_day or "",
                    }
                    for scene in sorted(getattr(ep, "scenes", []) or [], key=lambda s: s.order_idx)
                ],
            }
            for ep in episodes
        ],
    }


def _outline_episodes(payload: dict) -> list[dict]:
    outline = payload.get("outline")
    if not isinstance(outline, dict):
        return []
    episodes = outline.get("episodes")
    return episodes if isinstance(episodes, list) else []


def _script_lines(payload: dict) -> list[str]:
    lines = [
        payload["title"],
        "",
        f"类型: {payload.get('genre') or '未设置'}",
        f"概念: {payload.get('concept') or '未设置'}",
    ]
    if payload.get("logline"):
        lines.append(f"一句话梗概: {payload['logline']}")

    lines.extend(["", "角色"])
    characters = payload.get("characters") or []
    if characters:
        for char in characters:
            traits = "、".join(char.get("personality") or [])
            desc = "；".join(
                item for item in [
                    char.get("role"),
                    traits,
                    char.get("motivation"),
                    char.get("speech_style"),
                ] if item
            )
            lines.append(f"- {char.get('name', '未命名角色')}: {desc or '暂无描述'}")
    else:
        lines.append("- 暂无角色档案")

    episodes = payload.get("episodes") or []
    outline_episodes = _outline_episodes(payload)
    lines.extend(["", "剧集"])

    if episodes:
        for ep in episodes:
            lines.extend(["", f"第 {ep.get('ep_number')} 集 {ep.get('title') or ''}".strip()])
            if ep.get("summary"):
                lines.append(f"概要: {ep['summary']}")
            if ep.get("cliffhanger"):
                lines.append(f"钩子: {ep['cliffhanger']}")
            for scene in ep.get("scenes") or []:
                prefix = scene.get("character_name") if scene.get("scene_type") == "dialogue" else scene.get("scene_type", "scene")
                lines.append(f"{prefix}: {scene.get('content', '')}")
    elif outline_episodes:
        for idx, ep in enumerate(outline_episodes, start=1):
            number = ep.get("ep_number") or ep.get("episode") or idx
            title = ep.get("title") or f"第{number}集"
            lines.extend(["", f"第 {number} 集 {title}"])
            for key in ("summary", "synopsis", "hook", "cliffhanger"):
                if ep.get(key):
                    lines.append(str(ep[key]))
    else:
        lines.append("暂无剧集内容。")

    return lines


def _write_docx(payload: dict, file_path: Path) -> None:
    from docx import Document

    document = Document()
    document.add_heading(payload["title"], level=0)
    for line in _script_lines(payload)[2:]:
        if not line:
            document.add_paragraph("")
        elif line in {"角色", "剧集"} or re.match(r"^第\s+\d+\s+集", line):
            document.add_heading(line, level=1 if line in {"角色", "剧集"} else 2)
        else:
            document.add_paragraph(line)
    document.save(file_path)


def _register_pdf_font() -> str:
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/Supplemental/Songti.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
    ]
    for font_path in candidates:
        if os.path.exists(font_path):
            pdfmetrics.registerFont(TTFont("DGChinese", font_path))
            return "DGChinese"
    return "Helvetica"


def _write_pdf(payload: dict, file_path: Path) -> None:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

    font_name = _register_pdf_font()
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="DGTitle", parent=styles["Title"], fontName=font_name, fontSize=22, leading=28))
    styles.add(ParagraphStyle(name="DGHeading", parent=styles["Heading2"], fontName=font_name, fontSize=15, leading=20))
    styles.add(ParagraphStyle(name="DGBody", parent=styles["BodyText"], fontName=font_name, fontSize=10.5, leading=16))

    story = [Paragraph(payload["title"], styles["DGTitle"]), Spacer(1, 12)]
    for line in _script_lines(payload)[2:]:
        if not line:
            story.append(Spacer(1, 8))
        elif line in {"角色", "剧集"} or re.match(r"^第\s+\d+\s+集", line):
            story.append(Paragraph(line, styles["DGHeading"]))
        else:
            story.append(Paragraph(line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), styles["DGBody"]))
    doc = SimpleDocTemplate(str(file_path), pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    doc.build(story)


def _write_fountain(payload: dict, file_path: Path) -> None:
    lines = [f"Title: {payload['title']}", "Credit: Generated by DaraGenius", ""]
    for line in _script_lines(payload)[2:]:
        if line.startswith("第 "):
            lines.extend(["", f"# {line}", ""])
        elif line.startswith("- "):
            lines.append(f"// {line}")
        elif ": " in line:
            name, content = line.split(": ", 1)
            if len(name) <= 12 and not name.startswith(("类型", "概念", "概要", "钩子")):
                lines.extend(["", name.upper(), content])
            else:
                lines.append(line)
        else:
            lines.append(line)
    file_path.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")


def _write_json(payload: dict, file_path: Path) -> None:
    file_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _create_export_file(project: Any, export_format: str) -> tuple[str, str]:
    payload = _project_to_payload(project)
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename = f"{_safe_filename(payload['title'])}-{timestamp}.{export_format}"
    file_path = EXPORT_DIR / filename

    if export_format == "docx":
        _write_docx(payload, file_path)
    elif export_format == "pdf":
        _write_pdf(payload, file_path)
    elif export_format == "fountain":
        _write_fountain(payload, file_path)
    elif export_format == "json":
        _write_json(payload, file_path)

    return filename, f"/static/temp/exports/{filename}"


@router.post("/generate-plan")
async def generate_plan(
    req: GeneratePlanRequest,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    生成创作方案 (串联 Prophet + Soul + Arbiter + 大纲)

    流程 (SSE 多阶段流式):
    1. Prophet: 分析舆情 → 热点关键词
    2. Soul: 生成角色阵容
    3. Arbiter: 设计决策点
    4. Outline: 融合以上结果 → 生成 6 集大纲

    前端通过 SSE 实时接收每个阶段的进度
    """

    async def generate_stream():
        try:
            # ── Stage 1: Prophet 舆情分析 ──
            yield format_sse({"stage": "prophet", "label": "舆情分析"}, "stage_start")
            yield format_sse({"stage": "prophet", "content": "正在分析市场舆情..."}, "message")

            prophet_result = await qwen_service.analyze_trends(
                f"请分析「{req.concept}」相关的短剧市场舆情"
            )

            # 解析关键词（容错：支持有/无 code fence）
            keywords = []
            try:
                if "```json" in prophet_result:
                    json_str = prophet_result.split("```json")[1].split("```")[0].strip()
                elif "```" in prophet_result:
                    json_str = prophet_result.split("```")[1].split("```")[0].strip()
                else:
                    json_str = prophet_result.strip()
                data = json.loads(json_str)
                keywords = [k.get("word", "") for k in data.get("keywords", [])[:5]]
            except Exception:
                keywords = ["短剧", "互动", req.genre or "悬疑"]

            yield format_sse({
                "stage": "prophet",
                "content": f"发现热门关键词: {', '.join(keywords)}",
                "keywords": keywords
            }, "message")
            yield format_sse({"stage": "prophet", "status": "complete"}, "stage_end")

            # ── Stage 2: Soul 角色生成 ──
            yield format_sse({"stage": "soul", "label": "角色建模"}, "stage_start")
            yield format_sse({"stage": "soul", "content": "正在生成角色阵容..."}, "message")

            soul_result = await qwen_service.generate_characters(req.concept)

            characters = []
            try:
                if "```json" in soul_result:
                    json_str = soul_result.split("```json")[1].split("```")[0].strip()
                elif "```" in soul_result:
                    json_str = soul_result.split("```")[1].split("```")[0].strip()
                else:
                    json_str = soul_result.strip()
                data = json.loads(json_str)
                characters = data.get("characters", [])
            except Exception:
                characters = [{"name": "主角", "role": "protagonist", "traits": ["坚韧"]}]

            char_names = [c.get("name", "角色") for c in characters[:4]]
            yield format_sse({
                "stage": "soul",
                "content": f"生成 {len(characters)} 个角色: {', '.join(char_names)}",
                "characters": characters
            }, "message")
            yield format_sse({"stage": "soul", "status": "complete"}, "stage_end")

            # ── Stage 3: Arbiter 决策设计 ──
            yield format_sse({"stage": "arbiter", "label": "决策设计"}, "stage_start")
            yield format_sse({"stage": "arbiter", "content": "正在设计互动决策点..."}, "message")

            arbiter_result = await qwen_service.design_decisions(req.concept)

            decisions = []
            monetization = {}
            try:
                if "```json" in arbiter_result:
                    json_str = arbiter_result.split("```json")[1].split("```")[0].strip()
                elif "```" in arbiter_result:
                    json_str = arbiter_result.split("```")[1].split("```")[0].strip()
                else:
                    json_str = arbiter_result.strip()
                data = json.loads(json_str)
                decisions = data.get("decisions", [])
                monetization = data.get("monetization", {})
            except Exception:
                decisions = [{"scene": "关键转折点", "question": "如何抉择？", "choices": []}]

            yield format_sse({
                "stage": "arbiter",
                "content": f"设计 {len(decisions)} 个决策点",
                "decisions": decisions,
                "monetization": monetization
            }, "message")
            yield format_sse({"stage": "arbiter", "status": "complete"}, "stage_end")

            # ── Stage 4: 大纲生成 ──
            yield format_sse({"stage": "outline", "label": "大纲生成"}, "stage_start")
            yield format_sse({"stage": "outline", "content": "正在生成 6 集大纲..."}, "message")

            outline_result = await qwen_service.generate_outline(
                concept=req.concept,
                keywords=", ".join(keywords),
                characters=json.dumps(characters[:4], ensure_ascii=False)
            )

            outline = {}
            try:
                if "```json" in outline_result:
                    json_str = outline_result.split("```json")[1].split("```")[0].strip()
                    outline = json.loads(json_str)
            except Exception:
                raise RuntimeError("Outline 阶段返回内容不是合法 JSON")

            yield format_sse({
                "stage": "outline",
                "content": f"大纲生成完成: {outline.get('title', '未命名')}",
                "outline": outline
            }, "message")
            yield format_sse({"stage": "outline", "status": "complete"}, "stage_end")

            # ── 完成 ──
            final_result = {
                "keywords": keywords,
                "characters": characters,
                "decisions": decisions,
                "monetization": monetization,
                "outline": outline
            }
            if req.project_id and user_id and not settings.DEV_SKIP_DB:
                result = await db.execute(
                    select(Project).where(Project.id == req.project_id, Project.user_id == user_id)
                )
                project = result.scalar_one_or_none()
                if project:
                    project.outline_json = final_result
                    project.status = "writing"
                    if outline.get("title") and (not project.title or project.title == "新建项目"):
                        project.title = outline["title"]
                    if not project.characters:
                        for char_data in characters[:8]:
                            db.add(Character(
                                project_id=project.id,
                                name=char_data.get("name", "未命名"),
                                role=char_data.get("role", "supporting"),
                                personality=char_data.get("personality") or [],
                                backstory=char_data.get("backstory"),
                                motivation=char_data.get("motivation"),
                                speech_style=char_data.get("speech_style"),
                                appearance=char_data.get("appearance"),
                                signature_line=char_data.get("signature_line"),
                                arc=char_data.get("arc"),
                            ))
                    if not project.episodes:
                        for idx, ep_data in enumerate(outline.get("episodes") or [], start=1):
                            db.add(Episode(
                                project_id=project.id,
                                ep_number=ep_data.get("ep_number") or ep_data.get("episode") or idx,
                                title=ep_data.get("title") or f"第{idx}集",
                                summary=ep_data.get("summary") or ep_data.get("synopsis"),
                                cliffhanger=ep_data.get("cliffhanger") or ep_data.get("hook"),
                                status="draft",
                            ))
                    await db.commit()
            yield format_sse({"status": "all_complete", "result": final_result}, "done")

        except Exception as e:
            yield format_sse({"error": str(e)}, "error")

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/continue")
async def continue_script(
    req: ContinueRequest,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    AI 续写剧本 (SSE 流式输出)

    前端收到的是逐字流式文本，可以实现打字机效果
    """
    try:
        if settings.DEV_SKIP_DB and not settings.ALLOW_DEMO_DATA:
            raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时续写不可用于生产验证")

        # Demo 模式：跳过数据库查询，直接走 LLM 续写
        if not settings.DEV_SKIP_DB:
            # 验证项目所有权
            result = await db.execute(
                select(Project).where(Project.id == req.project_id, Project.user_id == user_id)
            )
            project = result.scalar_one_or_none()
            if not project:
                raise HTTPException(status_code=404, detail="项目不存在")

        # 组装上下文
        context = ""
        if req.context_scenes:
            for scene in req.context_scenes[-10:]:  # 最近 10 个场景
                scene_type = scene.get("type", "dialogue")
                content = scene.get("content", "")
                char_name = scene.get("character_name", "")
                if scene_type == "dialogue" and char_name:
                    context += f"{char_name}：{content}\n"
                elif scene_type == "narration":
                    context += f"（{content}）\n"
                else:
                    context += f"〈{content}〉\n"

        # 组装角色信息
        characters_str = ""
        if req.characters:
            for char in req.characters[:4]:
                characters_str += f"- {char.get('name', '角色')}: {char.get('speech_style', '普通')}\n"

        # 流式续写
        generator = qwen_service.continue_script_stream(
            context=context or "（剧本开始）",
            characters=characters_str or "（角色待定）",
            mood=req.mood,
            instruction=req.instruction
        )
        return await sse_response(generator)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"续写失败: {str(e)}")


@router.post("/project")
async def create_project(
    req: CreateProjectRequest,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db)
):
    """创建新项目"""
    if settings.DEV_SKIP_DB:
        if not settings.ALLOW_DEMO_DATA:
            raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时项目创建不可用于生产验证")
        # Demo 模式：内存存储
        proj_id = str(uuid.uuid4())
        _demo_projects[proj_id] = {
            "id": proj_id,
            "user_id": user_id,
            "title": req.title,
            "concept": req.concept,
            "genre": req.genre,
            "status": "draft",
            "created_at": datetime.utcnow().isoformat(),
            "characters": [],
            "episodes": [],
        }
        return {
            "id": proj_id,
            "title": req.title,
            "concept": req.concept,
            "genre": req.genre,
            "status": "draft"
        }

    project = Project(
        user_id=user_id,
        title=req.title,
        concept=req.concept,
        genre=req.genre,
        status="draft"
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    return {
        "id": str(project.id),
        "title": project.title,
        "concept": project.concept,
        "genre": project.genre,
        "status": project.status
    }


@router.get("/project/{project_id}")
@router.get("/projects/{project_id}")
async def get_project(
    project_id: str,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db)
):
    """获取项目详情"""
    if settings.DEV_SKIP_DB:
        if not settings.ALLOW_DEMO_DATA:
            raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时项目详情不可用于生产验证")
        proj = _demo_projects.get(project_id)
        if not proj or (proj.get("id") not in _BUILTIN_PROJECT_IDS and proj.get("user_id") != user_id):
            raise HTTPException(status_code=404, detail="项目不存在")
        return proj

    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    return {
        "id": str(project.id),
        "title": project.title,
        "concept": project.concept,
        "genre": project.genre,
        "logline": project.logline,
        "status": project.status,
        "outline": project.outline_json,
        "characters": [
            {"id": str(c.id), "name": c.name, "role": c.role}
            for c in project.characters
        ],
        "episodes": [
            {
                "id": str(e.id),
                "ep_number": e.ep_number,
                "title": e.title,
                "summary": e.summary,
                "status": e.status,
                "scenes": [
                    {
                        "id": str(scene.id),
                        "order_idx": scene.order_idx,
                        "scene_type": scene.scene_type,
                        "character_name": scene.character_name,
                        "content": scene.content,
                        "mood": scene.mood,
                        "location": scene.location,
                        "time_of_day": scene.time_of_day,
                    }
                    for scene in sorted(e.scenes or [], key=lambda s: s.order_idx)
                ],
            }
            for e in project.episodes
        ]
    }


@router.delete("/project/{project_id}")
async def delete_project(
    project_id: str,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db)
):
    """删除项目"""
    if settings.DEV_SKIP_DB:
        if not settings.ALLOW_DEMO_DATA:
            raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时项目删除不可用于生产验证")
        project = _demo_projects.get(project_id)
        if project_id in _BUILTIN_PROJECT_IDS:
            raise HTTPException(status_code=403, detail="内置展示项目不可删除")
        if not project or project.get("user_id") != user_id:
            raise HTTPException(status_code=404, detail="项目不存在")
        del _demo_projects[project_id]
        return {"success": True, "id": project_id}

    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    await db.delete(project)
    await db.commit()
    return {"success": True, "id": project_id}


@router.post("/episodes/{episode_id}/scenes")
async def save_scene(
    episode_id: str,
    req: SceneRequest,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db)
):
    """保存剧集场景"""
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="场景内容不能为空")

    if settings.DEV_SKIP_DB:
        if not settings.ALLOW_DEMO_DATA:
            raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时场景保存不可用于生产验证")
        scene_id = str(uuid.uuid4())
        scene = {
            "id": scene_id,
            "episode_id": episode_id,
            "order_idx": req.order_idx,
            "scene_type": req.scene_type,
            "character_id": req.character_id,
            "character_name": req.character_name,
            "content": req.content,
            "mood": req.mood,
            "location": req.location,
            "time_of_day": req.time_of_day,
            "created_at": datetime.utcnow().isoformat(),
        }
        _demo_scenes.setdefault(episode_id, []).append(scene)
        return scene

    result = await db.execute(select(Episode).where(Episode.id == episode_id))
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="剧集不存在")

    scene = Scene(
        episode_id=episode.id,
        order_idx=req.order_idx,
        scene_type=req.scene_type,
        character_id=req.character_id,
        character_name=req.character_name,
        content=req.content,
        mood=req.mood,
        location=req.location,
        time_of_day=req.time_of_day,
    )
    db.add(scene)
    episode.word_count = (episode.word_count or 0) + len(req.content)
    await db.commit()
    await db.refresh(scene)
    return {
        "id": str(scene.id),
        "episode_id": str(scene.episode_id),
        "order_idx": scene.order_idx,
        "scene_type": scene.scene_type,
        "character_id": str(scene.character_id) if scene.character_id else None,
        "character_name": scene.character_name,
        "content": scene.content,
        "mood": scene.mood,
        "location": scene.location,
        "time_of_day": scene.time_of_day,
    }


@router.get("/projects")
async def list_projects(
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db)
):
    """列出用户的所有项目"""
    if settings.DEV_SKIP_DB:
        if not settings.ALLOW_DEMO_DATA:
            raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时项目列表不可用于生产验证")
        return {
            "projects": [
                p for p in _demo_projects.values()
                if p.get("id") in _BUILTIN_PROJECT_IDS or p.get("user_id") == user_id
            ]
        }

    result = await db.execute(
        select(Project).where(Project.user_id == user_id)
    )
    projects = result.scalars().all()

    return {
        "projects": [
            {
                "id": str(p.id),
                "title": p.title,
                "concept": p.concept,
                "genre": p.genre,
                "status": p.status,
                "created_at": p.created_at.isoformat(),
                "updated_at": p.updated_at.isoformat() if p.updated_at else p.created_at.isoformat(),
                "outline": bool(p.outline_json),
                "character_count": len(p.characters or []),
                "decision_count": len(p.decisions or []),
                "episode_count": len(p.episodes or []),
                "word_count": sum((ep.word_count or 0) for ep in (p.episodes or [])),
                "stages": {
                    "prophet": bool(p.outline_json),
                    "soul": bool(p.characters),
                    "arbiter": bool(p.decisions),
                    "script": bool(p.episodes),
                    "producer": False,
                },
            }
            for p in projects
        ]
    }


@router.post("/export")
async def export_project(
    req: ExportRequest,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    导出项目为文件
    """
    export_format = _normalize_export_format(req.format)

    if settings.DEV_SKIP_DB:
        if not settings.ALLOW_DEMO_DATA:
            raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时导出不可用于生产验证")
        project = _demo_projects.get(req.project_id)
        if not project:
            raise HTTPException(status_code=404, detail="项目不存在")
        filename, download_url = _create_export_file(project, export_format)
        return {
            "message": "导出成功",
            "format": export_format,
            "filename": filename,
            "download_url": download_url,
        }

    # 验证项目
    result = await db.execute(
        select(Project).where(Project.id == req.project_id, Project.user_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    filename, download_url = _create_export_file(project, export_format)
    return {
        "message": "导出成功",
        "format": export_format,
        "filename": filename,
        "download_url": download_url,
    }
