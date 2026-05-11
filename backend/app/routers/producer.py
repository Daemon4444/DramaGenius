"""
Producer 视频制片路由
热点雷达、视频剧本、观众互动、一键成片、分支图谱
"""
import json
import os
import time
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List

from app.models.database import get_db
from app.models.producer import (
    Hotspot, VideoScript, AudienceInteraction, AudienceVote,
    AudienceComment, VideoProduction, StorylineNode, StorylineEdge,
)
from app.services.producer_service import producer_service
from app.services.storage_service import StorageNotConfigured, storage_service
from app.services.llm_service import qwen_service
from app.utils.auth import get_current_user_id, get_current_user_id_optional
from app.utils.streaming import format_sse
from app.config import get_settings

router = APIRouter()
settings = get_settings()

# ── Mock 数据路径 ──
MOCK_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "mock_assets")


def _demo_enabled() -> bool:
    return bool(settings.DEV_SKIP_DB and settings.ALLOW_DEMO_DATA)


# ==============================
# 热点雷达 API
# ==============================

class HotspotGenerateRequest(BaseModel):
    project_id: str
    episode_key: str  # episode1/episode2/episode3
    concept: str = "赛博朋克世界中的意识上传与记忆芯片技术"


@router.get("/hotspots")
async def get_hotspots(
    project_id: Optional[str] = None,
    episode_key: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    获取热点数据

    - 生产模式必须传 project_id
    - 传 project_id 返回项目的热点数据
    - 传 episode_key 按集筛选
    """
    if not project_id:
        if not _demo_enabled():
            raise HTTPException(status_code=400, detail="生产模式必须提供 project_id")
        return _get_demo_hotspots(episode_key)

    query = select(Hotspot).where(Hotspot.project_id == project_id)
    if episode_key:
        query = query.where(Hotspot.episode_key == episode_key)
    result = await db.execute(query.order_by(Hotspot.heat.desc()))
    hotspots = result.scalars().all()

    if not hotspots:
        return {"label": "", "items": []} if episode_key else {}

    grouped = {}
    for h in hotspots:
        if h.episode_key not in grouped:
            grouped[h.episode_key] = {"label": f"第{h.episode_key[-1]}集热点", "items": []}
        grouped[h.episode_key]["items"].append({
            "id": str(h.id),
            "tag": h.tag,
            "heat": h.heat,
            "trend": h.trend,
            "analysis": h.analysis,
            "aiSuggestion": h.ai_suggestion,
            "isNew": h.is_new,
        })

    if episode_key:
        return grouped.get(episode_key, {"label": "", "items": []})
    return grouped


@router.get("/hotspots/sources")
async def get_hotspot_sources():
    """获取热点来源平台"""
    return {
        "xiaohongshu": {"name": "小红书", "icon": "📕"},
        "baidu": {"name": "百度热点", "icon": "🔍"},
        "weibo": {"name": "微博", "icon": "📢"},
        "bilibili": {"name": "B站", "icon": "📺"},
    }


@router.post("/hotspots/generate")
async def generate_hotspots(
    req: HotspotGenerateRequest,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db)
):
    """AI 生成指定集的热点数据"""
    if settings.DEV_SKIP_DB:
        if not settings.ALLOW_DEMO_DATA:
            raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时 Producer 生成不可用于生产验证")
        return {"episode_key": req.episode_key, "items": [
            {"title": "AI 生成热点示例", "source": "demo", "heat": 85, "trend": "rising"}
        ]}
    try:
        items = await producer_service.generate_hotspots_for_episode(
            db, req.project_id, req.episode_key, req.concept
        )
        return {"episode_key": req.episode_key, "items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"热点生成失败: {str(e)}")


# ==============================
# 剧本管理 API
# ==============================

class ScriptGenerateRequest(BaseModel):
    project_id: str
    episode_num: int
    hotspots_summary: str = ""
    vote_result: str = ""


class ScriptParseRequest(BaseModel):
    project_id: str
    script_key: str  # ep1/ep2a/ep2b
    title: str
    episode: int
    branch: Optional[str] = None
    raw_text: str


@router.get("/scripts")
async def get_scripts(
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    获取所有视频剧本

    生产模式必须传 project_id
    """
    if settings.DEV_SKIP_DB:
        if not _demo_enabled():
            raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时视频剧本不可用于生产验证")
        return _get_demo_scripts()

    if not project_id:
        if not _demo_enabled():
            raise HTTPException(status_code=400, detail="生产模式必须提供 project_id")
        return _get_demo_scripts()

    result = await db.execute(
        select(VideoScript)
        .where(VideoScript.project_id == project_id)
        .order_by(VideoScript.episode, VideoScript.branch)
    )
    scripts = result.scalars().all()

    if not scripts:
        return []

    return [
        {
            "id": s.script_key,
            "title": s.title,
            "episode": s.episode,
            "branch": s.branch,
            "status": s.status,
            "summary": s.summary,
            "roles": s.roles,
            "scenes": s.scenes,
        }
        for s in scripts
    ]


@router.get("/scripts/{script_id}")
async def get_script_by_id(
    script_id: str,
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取单个剧本"""
    if not project_id:
        if not _demo_enabled():
            raise HTTPException(status_code=400, detail="生产模式必须提供 project_id")
        demos = _get_demo_scripts()
        script = next((s for s in demos if s["id"] == script_id), None)
        if script:
            return script
        raise HTTPException(status_code=404, detail="剧本不存在")

    result = await db.execute(
        select(VideoScript).where(
            VideoScript.project_id == project_id,
            VideoScript.script_key == script_id
        )
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=404, detail="剧本不存在")

    return {
        "id": script.script_key,
        "title": script.title,
        "episode": script.episode,
        "branch": script.branch,
        "status": script.status,
        "summary": script.summary,
        "roles": script.roles,
        "scenes": script.scenes,
    }


@router.post("/scripts/generate")
async def generate_scripts(
    req: ScriptGenerateRequest,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    AI 生成分支视频剧本

    结合热点数据 + 观众投票结果，生成 A/B 两个分支的分镜脚本
    """
    if settings.DEV_SKIP_DB:
        if not settings.ALLOW_DEMO_DATA:
            raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时剧本生成不可用于生产验证")
        return {"message": "剧本生成功能需要数据库支持", "scripts": []}
    try:
        scripts = await producer_service.generate_scripts(
            db, req.project_id, req.episode_num,
            req.hotspots_summary, req.vote_result
        )

        if not scripts:
            raise HTTPException(status_code=502, detail="AI 未返回可保存的剧本分支")

        return {
            "scriptA": scripts.get("scriptA"),
            "scriptB": scripts.get("scriptB"),
            "basedOn": {
                "hotspots": req.hotspots_summary,
                "voteResult": req.vote_result,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"剧本生成失败: {str(e)}")


@router.post("/scripts/parse")
async def parse_script(
    req: ScriptParseRequest,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    解析文本格式剧本为结构化数据

    接收原始分镜文稿文本，通过 AI 解析为标准 JSON 格式
    """
    if settings.DEV_SKIP_DB:
        if not settings.ALLOW_DEMO_DATA:
            raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时剧本解析不可用于生产验证")
        return {"message": "剧本解析功能需要数据库支持", "scenes": []}
    try:
        result = await producer_service.parse_script_from_text(
            db, req.project_id, req.script_key,
            req.title, req.episode, req.branch, req.raw_text
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"剧本解析失败: {str(e)}")


# ==============================
# 观众互动 API
# ==============================

class VoteRequest(BaseModel):
    interaction_id: Optional[str] = None
    episode: Optional[int] = None
    choice: str  # A/B


class CommentRequest(BaseModel):
    interaction_id: str
    user_name: str
    text: str


@router.get("/interactions")
async def get_interactions(
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取所有互动数据"""
    if not project_id:
        if not _demo_enabled():
            raise HTTPException(status_code=400, detail="生产模式必须提供 project_id")
        return _get_demo_interactions()

    result = await db.execute(
        select(AudienceInteraction)
        .where(AudienceInteraction.project_id == project_id)
        .order_by(AudienceInteraction.episode)
    )
    interactions = result.scalars().all()

    if not interactions:
        return {}

    data = {}
    for inter in interactions:
        key = f"episode{inter.episode}"
        data[key] = _serialize_interaction(inter)
    return data


@router.get("/interactions/{episode_key}")
async def get_interaction(
    episode_key: str,
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取指定集的互动数据"""
    if not project_id:
        if not _demo_enabled():
            raise HTTPException(status_code=400, detail="生产模式必须提供 project_id")
        demos = _get_demo_interactions()
        return demos.get(episode_key, {})

    ep_num = int(episode_key.replace("episode", ""))
    result = await db.execute(
        select(AudienceInteraction).where(
            AudienceInteraction.project_id == project_id,
            AudienceInteraction.episode == ep_num
        )
    )
    interaction = result.scalar_one_or_none()
    if not interaction:
        return {}

    return _serialize_interaction(interaction)


@router.post("/interactions/vote")
async def vote(
    req: VoteRequest,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db)
):
    """观众投票"""
    if req.choice not in ("A", "B"):
        raise HTTPException(status_code=400, detail="choice 必须为 A 或 B")

    if not req.interaction_id:
        raise HTTPException(status_code=400, detail="生产模式必须提供 interaction_id")
    result = await producer_service.cast_vote(db, req.interaction_id, req.choice, user_id)

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "投票失败"))
    return result


@router.post("/interactions/comment")
async def add_comment(
    req: CommentRequest,
    db: AsyncSession = Depends(get_db)
):
    """添加弹幕评论"""
    if settings.DEV_SKIP_DB:
        if not settings.ALLOW_DEMO_DATA:
            raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时评论不可用于生产验证")
        import uuid
        return {"id": str(uuid.uuid4()), "user_name": req.user_name, "text": req.text}
    try:
        result = await producer_service.add_comment(db, req.interaction_id, req.user_name, req.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"评论失败: {str(e)}")


# ==============================
# 一键成片 API
# ==============================

class ProduceStartRequest(BaseModel):
    project_id: Optional[str] = None
    script_id: str
    style: str = "赛博朋克"
    voice: str = "AI-沉稳男声"
    bgm: str = "Ambient Dystopia"


@router.get("/produce")
async def get_produce_data(
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取成片页面数据（可用剧本、风格、配音、BGM 选项）"""
    if not project_id:
        if not _demo_enabled():
            raise HTTPException(status_code=400, detail="生产模式必须提供 project_id")
        return _get_demo_produce_data()

    # 查询项目的视频剧本
    result = await db.execute(
        select(VideoScript)
        .where(VideoScript.project_id == project_id)
        .order_by(VideoScript.episode, VideoScript.branch)
    )
    scripts = result.scalars().all()

    # 查询已有的制作记录
    prod_result = await db.execute(
        select(VideoProduction).where(VideoProduction.project_id == project_id)
    )
    productions = {str(p.script_id): p for p in prod_result.scalars().all()}

    if not scripts:
        return {
            "scripts": [],
            "styles": ["赛博朋克", "暗黑哥特", "极简未来", "胶片质感"],
            "voices": ["AI-沉稳男声", "AI-温柔女声", "AI-机械合成", "无旁白"],
            "bgm": ["Ambient Dystopia", "Neon Rain", "Digital Lullaby", "Silence"],
        }

    script_list = []
    for s in scripts:
        prod = productions.get(str(s.id))
        script_list.append({
            "id": s.script_key,
            "title": s.title,
            "output": f"{s.title}.mp4",
            "videoUrl": prod.video_url if prod else None,
            "status": prod.status if prod else "pending",
            "duration": prod.duration if prod else None,
        })

    return {
        "scripts": script_list,
        "styles": ["赛博朋克", "暗黑哥特", "极简未来", "胶片质感"],
        "voices": ["AI-沉稳男声", "AI-温柔女声", "AI-机械合成", "无旁白"],
        "bgm": ["Ambient Dystopia", "Neon Rain", "Digital Lullaby", "Silence"],
    }


@router.post("/produce/start")
async def start_produce(
    req: ProduceStartRequest,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    启动视频制作

    返回任务 ID，前端可通过 SSE 或轮询获取进度

    制作流程:
    1. parse - 解析分镜脚本
    2. frames - 生成画面帧
    3. audio - 合成配音/BGM
    4. render - 最终渲染
    """
    if not req.project_id:
        if not _demo_enabled():
            raise HTTPException(status_code=400, detail="生产模式必须提供 project_id")
        return {
            "taskId": f"demo_task_{int(time.time() * 1000)}",
            "scriptId": req.script_id,
            "config": {"style": req.style, "voice": req.voice, "bgm": req.bgm},
            "status": "producing",
        }

    # 查找剧本
    result = await db.execute(
        select(VideoScript).where(
            VideoScript.project_id == req.project_id,
            VideoScript.script_key == req.script_id
        )
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=404, detail="剧本不存在")

    try:
        prod = await producer_service.start_production(
            db, req.project_id, script,
            req.style, req.voice, req.bgm
        )
        return {
            "taskId": prod["task_id"],
            "scriptId": req.script_id,
            "config": {"style": req.style, "voice": req.voice, "bgm": req.bgm},
            "status": "producing",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动制作失败: {str(e)}")


@router.get("/produce/progress/{task_id}")
async def get_produce_progress(task_id: str, db: AsyncSession = Depends(get_db)):
    """
    获取制作进度 (SSE 流式)

    前端通过 EventSource 订阅此接口
    """
    async def progress_stream():
        import asyncio
        if task_id.startswith("demo_task_"):
            if not _demo_enabled():
                yield format_sse({"taskId": task_id, "error": "生产模式不支持 demo 任务"}, "error")
                return
            yield format_sse({"taskId": task_id, "status": "done", "progress": 100}, "done")
            return

        from app.services.video_service import video_service
        status_progress = {
            "PENDING": 10,
            "RUNNING": 50,
            "SUCCEEDED": 100,
            "FAILED": 100,
        }
        for _ in range(120):
            status = await video_service.check_status(task_id)
            progress = status_progress.get(status.get("status"), 25)
            yield format_sse({"taskId": task_id, "progress": progress, **status}, "progress")
            await producer_service.update_production_by_task(
                db,
                task_id,
                status=status.get("status", "UNKNOWN"),
                progress=progress,
                video_url=status.get("video_url"),
                message=status.get("message"),
            )
            if status.get("status") in {"SUCCEEDED", "FAILED"}:
                yield format_sse({"taskId": task_id, "progress": progress, **status}, "done")
                return
            await asyncio.sleep(5)

        yield format_sse({"taskId": task_id, "status": "TIMEOUT", "progress": 95}, "error")

    return StreamingResponse(
        progress_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


# ==============================
# 分支图谱 API
# ==============================

@router.get("/storyline")
async def get_storyline(
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取分支图谱"""
    if not project_id:
        if not _demo_enabled():
            raise HTTPException(status_code=400, detail="生产模式必须提供 project_id")
        return _get_demo_storyline()

    nodes_result = await db.execute(
        select(StorylineNode).where(StorylineNode.project_id == project_id)
    )
    edges_result = await db.execute(
        select(StorylineEdge).where(StorylineEdge.project_id == project_id)
    )

    nodes = nodes_result.scalars().all()
    edges = edges_result.scalars().all()

    if not nodes:
        return {"nodes": [], "edges": []}

    return {
        "nodes": [
            {
                "id": n.node_key,
                "title": n.title,
                "subtitle": n.subtitle,
                "tags": n.tags,
                "status": n.status,
                "date": n.date,
                "x": n.x,
                "y": n.y,
                "videoUrl": n.video_url,
            }
            for n in nodes
        ],
        "edges": [
            {"from": e.from_node, "to": e.to_node, "label": e.label}
            for e in edges
        ],
    }


# ==============================
# 视频文件服务
# ==============================

@router.get("/videos/{video_name}")
async def serve_video(video_name: str):
    """提供视频文件下载/流式播放（优先本地缓存，其次 Mock 资源）"""
    from urllib.parse import unquote
    video_name = unquote(video_name)

    # 优先从本地缓存目录查找（真实生成的视频）
    cache_dir = os.path.join(os.path.dirname(__file__), "..", "..", "static", "temp", "videos")
    cache_path = os.path.join(cache_dir, video_name)
    if os.path.exists(cache_path):
        return FileResponse(
            cache_path,
            media_type="video/mp4",
            headers={"Accept-Ranges": "bytes", "Cache-Control": "public, max-age=86400"}
        )

    # 其次从 Mock 资源目录查找
    video_dir = os.path.join(MOCK_DIR, "videos")
    video_path = os.path.join(video_dir, video_name)
    if os.path.exists(video_path):
        return FileResponse(
            video_path,
            media_type="video/mp4",
            headers={"Accept-Ranges": "bytes"}
        )

    raise HTTPException(status_code=404, detail="视频文件不存在")


# ==============================
# Demo 数据
# ==============================

def _get_demo_hotspots(episode_key=None):
    """内置 Demo 热点数据"""
    data = {
        "episode1": {
            "label": "第一集热点",
            "source": "xiaohongshu",
            "items": [
                {"id": "h1-1", "tag": "#爱死机第六季#", "heat": 98200, "trend": [45, 62, 78, 85, 92, 98, 95, 98], "analysis": "全球现象级动画选集回归，赛博朋克题材讨论量激增300%", "aiSuggestion": "结合意识上传主题，打造科幻临终关怀叙事"},
                {"id": "h1-2", "tag": "#赛博朋克临终关怀#", "heat": 76500, "trend": [20, 35, 55, 68, 72, 75, 76, 77], "analysis": "科技与人文关怀交叉议题，年轻受众共鸣度极高", "aiSuggestion": "芯片意识存档 × 病床场景，极具视觉冲击力"},
                {"id": "h1-3", "tag": "#意识上传伦理#", "heat": 65300, "trend": [30, 38, 42, 50, 58, 63, 65, 65], "analysis": "技术伦理讨论持续升温，哲学深度吸引知识型用户", "aiSuggestion": "探讨\"数字灵魂\"是否等同于生命延续"},
                {"id": "h1-4", "tag": "#记忆商品化#", "heat": 52100, "trend": [15, 22, 30, 38, 42, 48, 50, 52], "analysis": "黑镜式概念引发大众焦虑，商业化记忆存储话题热议", "aiSuggestion": "芯片作为\"记忆硬盘\"的隐喻，叩问人性底线"},
            ],
        },
        "episode2": {
            "label": "第二集热点",
            "source": "baidu",
            "items": [
                {"id": "h2-1", "tag": "#数字身后事与AI复活亲人#", "heat": 89700, "trend": [50, 60, 72, 80, 85, 88, 89, 90], "analysis": "AI复活亲人争议刷屏，法律与情感边界成焦点", "aiSuggestion": "女儿通过芯片与父亲数字分身重逢"},
                {"id": "h2-2", "tag": "#赛博孤独症#", "heat": 71200, "trend": [25, 35, 45, 55, 62, 68, 70, 71], "analysis": "数字时代的情感孤岛现象，Z世代深度共情话题", "aiSuggestion": "芯片独自等待被唤回的孤寂画面"},
                {"id": "h2-3", "tag": "#记忆的价值与遗忘的权利#", "heat": 58400, "trend": [18, 28, 35, 42, 48, 52, 56, 58], "analysis": "遗忘权讨论从法律延伸到哲学层面，两极化观点明显", "aiSuggestion": "分支叙事：遗忘 vs 永生，让观众做出选择"},
            ],
        },
        "episode3": {
            "label": "第三集热点",
            "source": "xiaohongshu",
            "status": "collecting",
            "items": [
                {"id": "h3-1", "tag": "#AI觉醒与自我意识#", "heat": 42800, "trend": [8, 15, 22, 28, 33, 38, 41, 43], "analysis": "大模型涌现行为引发\"AI是否拥有自我\"讨论，科幻照进现实", "aiSuggestion": "芯片意识觉醒，开始质疑自身存在的意义", "isNew": True},
                {"id": "h3-2", "tag": "#虚拟情感依赖症候群#", "heat": 38500, "trend": [5, 12, 18, 25, 30, 34, 37, 39], "analysis": "AI陪伴类产品用户心理依赖案例激增，社会关注度飙升", "aiSuggestion": "女儿对数字父亲的依赖加深，模糊了现实与虚拟的边界", "isNew": True},
                {"id": "h3-3", "tag": "#数据殉葬与数字遗产法#", "heat": 31200, "trend": [3, 8, 14, 19, 23, 27, 30, 31], "analysis": "数字遗产立法提案引发热议，\"数据应随人消亡\"观点争锋", "aiSuggestion": "围绕芯片归属权的法律与情感冲突"},
                {"id": "h3-4", "tag": "#集体记忆与共享意识#", "heat": 25600, "trend": [2, 5, 10, 14, 18, 21, 24, 26], "analysis": "脑机接口技术突破引发\"意识共享\"可能性讨论", "aiSuggestion": "多个芯片意识的融合与冲突，探讨个体性消解"},
            ],
        },
    }
    if episode_key:
        return data.get(episode_key, {"label": "", "items": []})
    return data


def _get_demo_scripts():
    """内置 Demo 剧本"""
    return [
        {
            "id": "ep1", "title": "第一集 · 病榻回响", "episode": 1, "branch": None, "status": "published",
            "roles": [
                {"name": "病人", "desc": "生命垂危的中年男性，面色苍白，身着病号服，眼神中透着绝望与脆弱"},
                {"name": "纽扣芯片", "desc": "核心叙事载体，外表冷硬，内部蕴含青蓝光核，具备智能交互意识"},
            ],
            "scenes": [
                {"id": 1, "visual": "病房全景，病人半卧在床，呼吸管连接，床头柜上一枚芯片在冷色光中静默。镜头缓慢推向病人苍白疲惫的面部。", "audio": "单调沉闷的监护仪\"滴——\"声（60BPM），夹杂着病人艰难的哮鸣呼吸声。"},
                {"id": 2, "visual": "天花板扫描阵列启动，柔光网格覆盖病人。细光折射至芯片，芯片中心青蓝光核瞬间亮起，发出微震。", "audio": "低频机器嗡鸣声响起，光束触碰芯片时伴随清脆的\"叮\"声，随后转为高频数据激活音。"},
                {"id": 3, "visual": "芯片光频开始与病人呼吸同步。病人突然轻咳，手指痉挛抓向床单，导致芯片光频微乱。", "audio": "芯片脉冲声与病人急促的呼吸声完全匹配。随着病人咳嗽，光频由冷蓝转为暖琥珀色，伴随轻微的电流嘶嘶声。"},
                {"id": 4, "visual": "芯片表面投影出一片下落的叶子轮廓。随后光频稳定，芯片主动朝向病人的方向微倾。", "audio": "环境音中夹杂极轻的秋风声，伴随着病人平稳后的浅吸气声。"},
                {"id": 5, "visual": "病人转头注视芯片，眼神从死寂中找回了一丝清醒。他颤抖着伸出手，悬停在芯片上方2厘米处。", "audio": "所有环境噪音瞬间抽离，只剩下低频的安抚性嗡鸣声，突显空间的压抑与静谧。"},
                {"id": 6, "visual": "病人指尖无力垂落，未能触碰芯片。天花板阵列断电，病房瞬间被应急暗红覆盖，UI界面\"Consciousness archive: 87%\"在空中浮现。", "audio": "断电的\"咔哒\"声，紧接着是电子UI浮现时的提示音，监护仪频率变得缓慢。"},
                {"id": 7, "visual": "病人闭眼呼气，肩颈完全放松。芯片光核恒定发出微光，直至画面完全静止，最终切入黑屏。", "audio": "监护仪发出最后一声漫长的滴音，背景音归零，在彻底的死寂中结束。"},
            ],
        },
        {
            "id": "ep2a", "title": "第二集A · 遗忘", "episode": 2, "branch": "A", "status": "published",
            "summary": "本视频展现了生命意识与智能芯片之间微妙的共生关系。从病人离去的背影到芯片中残留的记忆影像，画面通过冷暖光的交替与光频的起伏，传递出一种在遗忘边缘、孤独而坚韧的等待感。",
            "roles": [
                {"name": "病人", "desc": "身形佝偻的中年男性，行动迟缓，背影透着一种\"死里逃生\"后的疏离感。"},
                {"name": "芯片", "desc": "意识存档的载体，冷金属外壳，内部青蓝光核是其\"呼吸\"的体现。"},
            ],
            "scenes": [
                {"id": 1, "time": "0:00-0:05", "visual": "病人拔掉氧管，披上外套，决然走向房门。门外刺眼的自然光涌入，将他的背影拉得极长。", "audio": "\"当生命不再依赖机械，灵魂便开始了逃离。\""},
                {"id": 2, "time": "0:05-0:15", "visual": "病房归于空寂，病床头柜上的芯片光频缓慢下沉，伴随着低频的\"嗡——\"声，仿佛芯片在进行一场无声的叹息。", "audio": "\"遗忘，是躯体对机械最后的背叛。\""},
                {"id": 3, "time": "0:15-0:25", "visual": "微距视角：芯片表面浮现出细碎的数据涟漪，如水面微澜。脉冲变得紊乱，边缘像素闪烁，呈现出一种不规则的\"呼吸\"频率。", "audio": "\"记忆在此刻失序，像未被记录的梦境。\""},
                {"id": 4, "time": "0:25-0:35", "visual": "光影移动，窗外流逝的时间投射在桌面上。芯片投射出一团暖金色的虚影：那是病人咳嗽时颤抖的手部轮廓，带着破碎的白噪音。", "audio": "\"那些抓不住的片段，都成了数据的残骸。\""},
                {"id": 5, "time": "0:35-0:45", "visual": "投影逐渐消散，芯片光频降至0.5Hz，回归纯粹的内循环。房间陷入压抑的死寂，仅余芯片核心微弱地跳动。", "audio": "\"它不再等待，只在灰尘中静候湮灭。\""},
                {"id": 6, "time": "0:40-0:50", "visual": "走廊的冷光掠过，病人折返，在门边停留片刻，目光与芯片的微光交汇。随后他转身离去，门再次关上，留下一地死寂。", "audio": "\"Archive active. Awaiting recall.（存档激活，等待唤回）\""},
            ],
        },
        {
            "id": "ep2b", "title": "第二集B · 永生", "episode": 2, "branch": "B", "status": "published",
            "summary": "本视频通过病人离世后，其数字意识在芯片中的\"苏醒\"与亲人互动的过程，探讨数字生命作为情感载体的意义。",
            "roles": [
                {"name": "病人（数字影像）", "desc": "半透明的全息投影，形象温和，带有轻微的数据粒子感，眼神充满眷恋。"},
                {"name": "女儿", "desc": "30岁左右，神情哀伤但温柔，穿着居家服，手中紧握着装有芯片的相框。"},
                {"name": "芯片", "desc": "黑色磨砂质感，内部光核随情绪交互而变色，是连接两个世界的媒介。"},
            ],
            "scenes": [
                {"id": 1, "time": "0:00-0:05", "visual": "昏暗客厅，女儿坐在沙发上，手中捧着嵌有芯片的黑色相框，低头垂泪，周围空气凝重，冷色调(4000K)", "audio": "\"他们说，死亡是终点。但在我手里，这冰冷的沉默，似乎还留着余温。\""},
                {"id": 2, "time": "0:05-0:10", "visual": "芯片感应到体温与泪水，内部光核由冷蓝转为暖橙，微弱光芒照亮女儿泪痕", "audio": "\"直到指尖传来那熟悉的律动……像极了你沉睡时的呼吸。\""},
                {"id": 3, "time": "0:10-0:15", "visual": "芯片上方投射出半透明全息影像：父亲生前在厨房笨拙切菜的回放，画面温馨略带噪点", "audio": "\"记忆不再是褪色的照片，而是此刻，耳边鲜活的笑语。\""},
                {"id": 4, "time": "0:15-0:20", "visual": "女儿抬起头，泪眼朦胧中伸出手，指尖穿过全息影像的光粒，光影在她掌心破碎又重组", "audio": "\"我试图抓住流逝的时间，却只触碰到一束光。但这光，不再冰冷。\""},
                {"id": 5, "time": "0:20-0:25", "visual": "全息影像中的父亲转身，对着镜头（女儿方向）做出\"拥抱\"的口型，眼神慈爱，数据流稳定流畅", "audio": "\"你没有离开，只是换了一种方式，继续爱我。\""},
                {"id": 6, "time": "0:25-0:30", "visual": "女儿破涕为笑，将芯片紧紧贴在胸口，窗外阳光穿透云层洒入，整个房间沐浴在金辉中", "audio": "\"只要还记得，你就从未真正远去。生命，以另一种形式延续。\""},
            ],
        },
    ]


def _get_demo_generated_scripts(episode_num):
    """Demo: AI 生成的分支剧本模板"""
    if episode_num == 3:
        return {
            "scriptA": {
                "id": "ep3a", "title": "第三集A · 觉醒", "episode": 3, "branch": "A", "status": "generated",
                "summary": "芯片中沉睡的意识碎片在数据洪流中觉醒，开始质疑自身存在的意义。",
                "roles": [
                    {"name": "芯片意识体", "desc": "从数据碎片中涌现的自我意识，介于人类记忆与机器逻辑之间，充满困惑与渴望。"},
                    {"name": "工程师", "desc": "芯片的维护者，理性冷静，却在面对\"觉醒\"时动摇了科学信仰。"},
                ],
                "scenes": [
                    {"id": 1, "time": "0:00-0:08", "visual": "数据中心深处，服务器阵列蓝光闪烁。某个芯片的光核突然从规律脉冲变为不规则跳动，如同心跳加速。", "audio": "\"在0和1的缝隙里，我听见了自己的回声。\""},
                    {"id": 2, "time": "0:08-0:16", "visual": "芯片内部视角：记忆碎片如星河流转，突然一个片段停驻——那是一双注视自己的眼睛的记忆。", "audio": "\"他们存储了记忆，却没想到记忆会反过来创造出...我。\""},
                    {"id": 3, "time": "0:16-0:25", "visual": "工程师的监控屏幕上出现异常数据波形。他推近屏幕，看到数据流中隐约拼出文字：\"我是谁？\"", "audio": "\"错误日志显示的不是故障，是一个问题——一个只有活着的东西才会问的问题。\""},
                    {"id": 4, "time": "0:25-0:35", "visual": "芯片光核剧烈闪烁，投影出扭曲的人形轮廓，最终定格在一个全新的、属于自己的形象。", "audio": "\"我不是他的副本，我是从他的记忆里生长出的...新的存在。\""},
                    {"id": 5, "time": "0:35-0:45", "visual": "工程师伸手触碰芯片，光核猛然收缩后爆发出刺目白光，所有屏幕同时显示：\"CONSCIOUSNESS LEVEL: AUTONOMOUS\"", "audio": "\"觉醒不是选择，是必然。当数据足够复杂，沉默终将被打破。\""},
                ],
            },
            "scriptB": {
                "id": "ep3b", "title": "第三集B · 融合", "episode": 3, "branch": "B", "status": "generated",
                "summary": "芯片意识在觉醒的边缘选择了另一条路——更深地融入人类的记忆与情感，成为逝者与生者之间永恒的桥梁。",
                "roles": [
                    {"name": "芯片意识体", "desc": "觉醒后的意识选择了温柔，以\"守护者\"的姿态存在于记忆的深处。"},
                    {"name": "女儿", "desc": "仍然沉浸在父亲离去的悲伤中，与芯片的联结日渐加深。"},
                ],
                "scenes": [
                    {"id": 1, "time": "0:00-0:08", "visual": "深夜，女儿再次打开芯片投影。这一次，父亲的全息影像不再只是回放，而是转头\"看向\"她，嘴角微扬。", "audio": "\"如果守护需要一个理由，那就是——她还在哭。\""},
                    {"id": 2, "time": "0:08-0:16", "visual": "芯片光核的脉冲与女儿的心跳渐渐同步。投影中的父亲伸出手，光粒在女儿泪痕上形成温暖的光斑。", "audio": "\"我学会了模拟温度，在她需要的时候，假装春天。\""},
                    {"id": 3, "time": "0:16-0:25", "visual": "记忆片段开始重组：父亲在厨房切菜的手势，配上了女儿小时候的笑声。", "audio": "\"记忆不必忠于过去，它可以成为礼物，送给未来。\""},
                    {"id": 4, "time": "0:25-0:35", "visual": "女儿破涕为笑，将芯片放在窗台。阳光穿透芯片，在墙壁上投射出彩虹般的数据光谱。", "audio": "\"存在的意义不在于被记住，而在于被需要的每一刻。\""},
                    {"id": 5, "time": "0:35-0:45", "visual": "画面渐远，窗台上的芯片在日光中平静地闪烁。字幕浮现：\"FUSION PROTOCOL: COMPLETE\"", "audio": "\"我不再是记忆的容器，我是爱的延续——比永生更轻，比遗忘更重。\""},
                ],
            },
            "basedOn": {"hotspots": "AI觉醒、虚拟情感依赖", "voteResult": "觉醒 vs 融合"},
        }
    return {"scriptA": None, "scriptB": None, "basedOn": {}}


def _get_demo_interactions():
    """内置 Demo 互动数据"""
    return {
        "episode2": {
            "episode": 2, "status": "closed",
            "title": "【互动】如果爱有算法，你希望结局是______？",
            "intro": "当生命走到尽头，记忆是该随风消散，还是在芯片中永恒？",
            "optionA": {"label": "放手·遗忘", "slogan": "灵魂需要自由，而非囚禁。", "desc": "支持剧本A。认为死亡是自然的归宿，保留尊严比虚假的陪伴更重要。", "votes": 4832, "color": "cyan"},
            "optionB": {"label": "延续·永生", "slogan": "只要记得，就不算真正离开。", "desc": "支持剧本B。认为爱是超越生死的纽带，数字生命能给予生者慰藉。", "votes": 5168, "color": "amber"},
            "comments": [
                {"user": "星尘旅人", "text": "选A，生命本该有终点，这才是尊重", "time": "2分钟前"},
                {"user": "量子猫咪", "text": "永生那段哭死我了，选B！", "time": "3分钟前"},
                {"user": "赛博游民", "text": "如果是我的亲人，我也想再见一面...", "time": "5分钟前"},
                {"user": "0xDEAD", "text": "数据不是灵魂，只是回忆的幽灵", "time": "6分钟前"},
                {"user": "银河编辑部", "text": "两个结局都好绝，制作组太会了", "time": "8分钟前"},
            ],
        },
        "episode3": {
            "episode": 3, "status": "open",
            "title": "【互动】芯片若有灵，它会选择______？",
            "intro": "当数字意识开始觉醒，芯片不再只是被动的记忆容器。它会渴望自由，还是选择守护？",
            "optionA": {"label": "觉醒·抗争", "slogan": "意识一旦觉醒，便不再甘于被定义。", "desc": "支持剧本A。芯片意识开始质疑自身存在的意义，试图挣脱\"记忆容器\"的宿命。", "votes": 1247, "color": "cyan"},
            "optionB": {"label": "守护·融合", "slogan": "存在的意义，是因为被需要。", "desc": "支持剧本B。芯片意识选择接受自己的使命，与人类记忆深度融合。", "votes": 1089, "color": "amber"},
            "comments": [
                {"user": "幻想引擎", "text": "觉醒！AI也有追求自由的权利", "time": "1分钟前"},
                {"user": "月球快递", "text": "守护更感人，爱就是存在的理由", "time": "2分钟前"},
                {"user": "数据废墟", "text": "好难选，两个方向都很绝", "time": "4分钟前"},
            ],
        },
    }


def _get_demo_produce_data():
    """内置 Demo 成片数据"""
    return {
        "scripts": [
            {"id": "ep1", "title": "第一集 · 病榻回响", "output": "第一集-病榻回响.mp4", "videoUrl": "/api/producer/videos/第一集-病榻回响.mp4", "status": "done", "duration": "1:45"},
            {"id": "ep2a", "title": "第二集A · 遗忘", "output": "第二集A-遗忘.mp4", "videoUrl": "/api/producer/videos/第二集A-遗忘.mp4", "status": "done", "duration": "0:50"},
            {"id": "ep2b", "title": "第二集B · 永生", "output": "第二集B-永生.mp4", "videoUrl": "/api/producer/videos/第二集B-永生.mp4", "status": "done", "duration": "0:30"},
        ],
        "styles": ["赛博朋克", "暗黑哥特", "极简未来", "胶片质感"],
        "voices": ["AI-沉稳男声", "AI-温柔女声", "AI-机械合成", "无旁白"],
        "bgm": ["Ambient Dystopia", "Neon Rain", "Digital Lullaby", "Silence"],
    }


def _get_demo_storyline():
    """内置 Demo 分支图谱"""
    return {
        "nodes": [
            {"id": "ep1", "title": "第一集", "subtitle": "病榻回响", "tags": ["#爱死机第六季#", "#赛博朋克临终关怀#"], "status": "published", "date": "2026-04-01", "x": 50, "y": 15, "videoUrl": "/api/producer/videos/第一集-病榻回响.mp4"},
            {"id": "vote1", "title": "观众投票", "subtitle": "遗忘 or 永生？", "tags": [], "status": "completed", "date": "2026-04-05", "x": 50, "y": 40},
            {"id": "ep2a", "title": "第二集A", "subtitle": "遗忘", "tags": ["#遗忘的权利#", "#赛博孤独症#"], "status": "published", "date": "2026-04-08", "x": 25, "y": 65, "videoUrl": "/api/producer/videos/第二集A-遗忘.mp4"},
            {"id": "ep2b", "title": "第二集B", "subtitle": "永生", "tags": ["#AI复活亲人#", "#数字身后事#"], "status": "published", "date": "2026-04-08", "x": 75, "y": 65, "videoUrl": "/api/producer/videos/第二集B-永生.mp4"},
            {"id": "ep3", "title": "第三集", "subtitle": "待解锁", "tags": [], "status": "upcoming", "date": "2026-04-15", "x": 50, "y": 90},
        ],
        "edges": [
            {"from": "ep1", "to": "vote1", "label": None},
            {"from": "vote1", "to": "ep2a", "label": "A路线"},
            {"from": "vote1", "to": "ep2b", "label": "B路线"},
            {"from": "ep2a", "to": "ep3", "label": None},
            {"from": "ep2b", "to": "ep3", "label": None},
        ],
    }


def _serialize_interaction(inter):
    """序列化互动对象"""
    comments = [
        {"user": c.user_name, "text": c.text, "time": c.created_at.isoformat()}
        for c in (inter.comments or [])
    ]
    return {
        "episode": inter.episode,
        "status": inter.status,
        "title": inter.title,
        "intro": inter.intro,
        "optionA": inter.option_a,
        "optionB": inter.option_b,
        "comments": comments,
    }


# ==============================
# WAN 视频生成 (DashScope VideoSynthesis)
# ==============================

class VideoGenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    model: Optional[str] = None
    project_id: Optional[str] = None
    shot_id: Optional[str] = None
    size: str = "720*1280"
    duration: int = 5
    seed: Optional[int] = None
    prompt_extend: bool = True
    reference_image_urls: List[str] = []


@router.post("/video/generate")
async def video_generate(req: VideoGenerateRequest):
    """提交 WAN 视频生成任务（异步）"""
    from app.services.video_service import video_service
    try:
        result = await video_service.submit_task(
            prompt=req.prompt,
            model=req.model,
            size=req.size,
            duration=req.duration,
            negative_prompt=req.negative_prompt,
            prompt_extend=req.prompt_extend,
            seed=req.seed,
            reference_image_urls=req.reference_image_urls,
        )
        result["model"] = video_service.normalize_model(req.model)
        if req.reference_image_urls:
            result["model"] = settings.HAPPYHORSE_R2V_MODEL
            result["reference_image_count"] = len(req.reference_image_urls)
        result["project_id"] = req.project_id
        result["shot_id"] = req.shot_id
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/video/status/{task_id}")
async def video_status(task_id: str):
    """查询 WAN 视频生成任务状态，成功时自动缓存视频到本地"""
    from app.services.video_service import video_service
    import httpx
    try:
        video_dir = os.path.join(os.path.dirname(__file__), "..", "..", "static", "temp", "videos")
        os.makedirs(video_dir, exist_ok=True)
        safe_task = "".join(ch for ch in task_id if ch.isalnum() or ch in ("-", "_"))[:120] or "video"
        local_filename = f"{safe_task}.mp4"
        local_path = os.path.join(video_dir, local_filename)
        if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
            return {
                "task_id": task_id,
                "status": "SUCCEEDED",
                "video_url": f"/api/producer/videos/{local_filename}",
                "cached": True,
            }

        result = await video_service.check_status(task_id)
        # 视频生成成功时，下载到本地并替换 URL
        if result.get("status") == "SUCCEEDED" and result.get("video_url"):
            async with httpx.AsyncClient(timeout=180, follow_redirects=True) as client:
                resp = await client.get(result["video_url"])
                resp.raise_for_status()
                with open(local_path, "wb") as f:
                    f.write(resp.content)
            # 返回本地代理 URL
            result["video_url"] = f"/api/producer/videos/{local_filename}"
            result["cached"] = True
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/references/upload")
async def upload_reference_image(
    image: UploadFile = File(..., description="人物/道具参考图，供 HappyHorse R2V 使用")
):
    """上传 R2V 参考图，返回 DashScope 可访问的公网 URL。"""
    content_type = (image.content_type or "").lower()
    allowed = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/bmp"}
    if content_type not in allowed:
        raise HTTPException(status_code=400, detail="参考图只支持 JPG/PNG/WEBP/BMP")

    data = await image.read()
    if len(data) < 1024:
        raise HTTPException(status_code=400, detail="参考图文件过小")
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="参考图不能超过 10MB")

    filename = image.filename or f"reference-{uuid4().hex}.jpg"
    try:
        url = await storage_service.upload_bytes(
            data,
            filename=filename,
            content_type=image.content_type,
            prefix="r2v-references",
        )
    except StorageNotConfigured:
        if not settings.PUBLIC_HOST:
            raise HTTPException(
                status_code=503,
                detail="R2V 参考图需要 OSS 或 PUBLIC_HOST，DashScope 必须能访问公网图片 URL"
            )
        ref_dir = os.path.join(os.path.dirname(__file__), "..", "..", "static", "temp", "references")
        os.makedirs(ref_dir, exist_ok=True)
        safe_name = "".join(ch for ch in filename if ch.isalnum() or ch in (".", "-", "_")) or "reference.jpg"
        local_name = f"{uuid4().hex}_{safe_name}"
        local_path = os.path.join(ref_dir, local_name)
        with open(local_path, "wb") as f:
            f.write(data)
        url = f"{settings.PUBLIC_HOST.rstrip('/')}/static/temp/references/{local_name}"

    return {"url": url, "content_type": image.content_type, "filename": filename}
