"""
Soul 角色建模路由
"""
import asyncio
import json
import os
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.models.database import get_db
from app.models.project import Character, Project
from app.services.llm_service import qwen_service
from app.services.voice_service import voice_service
from app.services.storage_service import storage_service, StorageNotConfigured
from app.services.prompts import PROMPT_TEMPLATES
from app.utils.auth import get_current_user_id, get_current_user_id_optional
from app.config import get_settings

router = APIRouter()
settings = get_settings()


class GenerateRequest(BaseModel):
    project_id: Optional[str] = "demo-project"
    concept: str


class DialogueRequest(BaseModel):
    character_name: str
    personality: str
    scene: str
    speech_style: Optional[str] = ""
    core_desire: Optional[str] = ""


class VoicePreviewRequest(BaseModel):
    character_id: str
    text: str
    voice_params: Optional[dict] = None  # 可选：tone/pitch/speed 覆盖


class MemoryQueryRequest(BaseModel):
    character_id: str
    context: str


@router.post("/generate")
async def generate_characters(
    req: GenerateRequest,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    根据创意概要生成角色阵容

    Demo 模式 (DEV_SKIP_DB=true 或 project_id='demo-project'):
      - 跳过 DB 操作，直接返回 LLM 生成结果

    完整模式:
      - 验证项目所有权
      - 保存角色到数据库
    """
    try:
        is_demo = settings.DEV_SKIP_DB or (settings.ALLOW_DEMO_DATA and (not req.project_id or req.project_id == "demo-project"))
        if (not req.project_id or req.project_id == "demo-project") and not is_demo:
            raise HTTPException(status_code=400, detail="生产模式必须提供真实 project_id")

        # 验证项目（仅在非 demo 模式下）
        if not is_demo and user_id:
            result = await db.execute(
                select(Project).where(
                    Project.id == req.project_id,
                    Project.user_id == user_id
                )
            )
            project = result.scalar_one_or_none()
            if not project:
                raise HTTPException(status_code=404, detail="项目不存在")

        # 调用千问生成角色
        result_str = await qwen_service.generate_characters(req.concept)

        # 解析 JSON
        try:
            if "```json" in result_str:
                json_str = result_str.split("```json")[1].split("```")[0].strip()
            elif "```" in result_str:
                json_str = result_str.split("```")[1].split("```")[0].strip()
            else:
                json_str = result_str
            data = json.loads(json_str)
            characters_data = data.get("characters", [])
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="角色生成结果解析失败")

        # 保存到数据库（仅在完整模式下）
        if not is_demo:
            for char_data in characters_data:
                character = Character(
                    project_id=req.project_id,
                    name=char_data.get("name", "未命名"),
                    role=char_data.get("role", "supporting"),
                    age=char_data.get("age"),
                    gender=char_data.get("gender"),
                    personality=char_data.get("personality"),
                    backstory=char_data.get("backstory"),
                    motivation=char_data.get("motivation"),
                    speech_style=char_data.get("speech_style"),
                    appearance=char_data.get("appearance"),
                    signature_line=char_data.get("signature_line"),
                    arc=char_data.get("arc")
                )
                db.add(character)
                try:
                    await db.flush()
                    char_data["id"] = str(character.id)
                except Exception:
                    await db.rollback()
            if not settings.DEV_SKIP_DB:
                try:
                    await db.commit()
                except Exception:
                    await db.rollback()

        return {
            "characters": characters_data,
            "chemistry": data.get("chemistry", [])
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"角色生成失败: {str(e)}")


@router.post("/generate-dialogue")
async def generate_dialogue(req: DialogueRequest):
    """
    根据角色和场景生成台词

    无需认证，支持 Demo 模式
    """
    try:
        user_content = (
            f"角色: {req.character_name}\n"
            f"性格特征: {req.personality}\n"
            f"台词风格: {req.speech_style or '自然流畅'}\n"
            f"核心驱动: {req.core_desire or '未知'}\n"
            f"当前场景: {req.scene}\n\n"
            "请生成 3 句有辨识度的台词。"
        )
        messages = [
            {"role": "system", "content": PROMPT_TEMPLATES.get("soul_dialogue", "")},
            {"role": "user", "content": user_content},
        ]
        result_str = await qwen_service.chat(
            messages, model=settings.QWEN_MODEL_PLUS, max_tokens=800
        )

        # 解析 JSON
        try:
            if "```json" in result_str:
                json_str = result_str.split("```json")[1].split("```")[0].strip()
            elif "```" in result_str:
                json_str = result_str.split("```")[1].split("```")[0].strip()
            else:
                json_str = result_str
            return json.loads(json_str)
        except json.JSONDecodeError:
            # 解析失败时返回原始文本包装
            return {
                "dialogues": [
                    {"text": result_str[:80], "emotion": "坚定", "stage_direction": ""}
                ],
                "style_summary": "AI 生成"
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"台词生成失败: {str(e)}")


@router.get("/project/{project_id}")
async def get_project_characters(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取项目的所有角色"""
    if settings.DEV_SKIP_DB:
        if not settings.ALLOW_DEMO_DATA:
            raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时无法验证真实项目角色")
        return {"characters": []}

    result = await db.execute(
        select(Character).where(Character.project_id == project_id)
    )
    characters = result.scalars().all()
    return {
        "characters": [
            {
                "id": str(c.id),
                "name": c.name,
                "role": c.role,
                "age": c.age,
                "gender": c.gender,
                "personality": c.personality,
                "backstory": c.backstory,
                "motivation": c.motivation,
                "speech_style": c.speech_style,
                "appearance": c.appearance,
                "signature_line": c.signature_line,
                "arc": c.arc
            }
            for c in characters
        ]
    }


@router.post("/voice-preview")
async def preview_voice(
    req: VoicePreviewRequest,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    生成角色语音试听

    Demo 模式: 返回 TTS 参数供前端 Web Speech API 使用
    完整模式: 调用 DashScope CosyVoice API
    """
    # Demo 模式：直接返回 TTS 参数
    if settings.DEV_SKIP_DB or req.character_id == "demo":
        if not settings.ALLOW_DEMO_DATA:
            raise HTTPException(status_code=400, detail="生产模式必须提供真实 character_id")
        params = req.voice_params or {}
        return {
            "audio_url": None,
            "use_browser_tts": True,
            "tts_params": {
                "lang": "zh-CN",
                "rate": params.get("rate", 0.9),
                "pitch": params.get("pitch", 1.0),
                "volume": params.get("volume", 1.0),
            },
            "text": req.text,
        }

    try:
        result = await db.execute(
            select(Character).where(Character.id == req.character_id)
        )
        character = result.scalar_one_or_none()
        if not character:
            raise HTTPException(status_code=404, detail="角色不存在")

        if not character.voice_desc:
            char_profile = (
                f"姓名: {character.name}\n"
                f"角色: {character.role}\n"
                f"性格: {character.personality}\n"
                f"台词风格: {character.speech_style}"
            )
            voice_desc = await qwen_service.generate_voice_desc(char_profile)
            character.voice_desc = voice_desc
            await db.commit()

        audio_url = await voice_service.synthesize(
            text=req.text,
            voice_desc=character.voice_desc,
            character_name=character.name
        )

        return {
            "audio_url": audio_url,
            "use_browser_tts": audio_url is None,
            "tts_params": {"lang": "zh-CN", "rate": 0.9, "pitch": 1.0, "volume": 1.0},
            "text": req.text,
            "voice_desc": character.voice_desc,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"语音合成失败: {str(e)}")


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "longxiaochun_v2"   # CosyVoice v2 音色 ID
    speech_rate: Optional[float] = 1.0
    pitch_rate: Optional[float] = 1.0


@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    """
    CosyVoice v2 文本转语音

    返回 MP3 音频流，前端直接通过 <audio> 或 new Audio() 播放。
    无需认证，支持 Demo 模式。
    """
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="文本不能为空")

    if len(text) > 500:
        text = text[:500]

    if not settings.DASHSCOPE_API_KEY:
        raise HTTPException(status_code=503, detail="TTS 服务未配置 API Key")

    try:
        audio_bytes = await voice_service.synthesize_to_bytes(
            text=text,
            voice=req.voice or "longxiaochun_v2",
            speech_rate=req.speech_rate or 1.0,
            pitch_rate=req.pitch_rate or 1.0,
        )
    except (TimeoutError, asyncio.TimeoutError):
        raise HTTPException(status_code=504, detail="语音合成超时，请稍后重试")
    except (ConnectionError, OSError) as e:
        raise HTTPException(status_code=502, detail=f"语音服务连接失败: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"语音合成异常: {str(e)}")

    if not audio_bytes:
        raise HTTPException(status_code=503, detail="语音合成失败，请稍后重试")

    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache"},
    )


@router.post("/voice-clone")
async def clone_voice(
    audio: UploadFile = File(..., description="参考音频（mp3/wav/m4a/webm，10–60秒）"),
    prefix: str = Form(default="dg", description="音色前缀（仅小写字母+数字）"),
):
    """
    声音克隆：上传参考音频（文件或麦克风录音），创建专属音色 ID

    流程：
    1. 保存音频到 static/temp/，通过公网 URL 暴露给 DashScope
    2. 调用 VoiceEnrollmentService.create_voice() 创建克隆音色
    3. 返回 voice_id，后续 /tts 请求传入该 ID 即可使用克隆音色
    """
    if not settings.DASHSCOPE_API_KEY:
        raise HTTPException(status_code=503, detail="声音克隆服务未配置 API Key")

    # 校验前缀
    prefix = re.sub(r"[^a-z0-9]", "", prefix.lower())[:10] or "dg"

    # 读取上传内容
    audio_bytes = await audio.read()
    if len(audio_bytes) < 5000:
        raise HTTPException(status_code=400, detail="音频过短，请提供至少 5 秒的参考音频")
    if len(audio_bytes) > 30 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="音频文件过大（限 30MB）")

    # 根据 content_type 决定后缀
    content_type = (audio.content_type or "").lower()
    if "webm" in content_type or "ogg" in content_type:
        suffix = ".webm"
    elif "wav" in content_type:
        suffix = ".wav"
    else:
        suffix = ".mp3"

    import uuid, asyncio
    filename = f"clone_{prefix}_{uuid.uuid4().hex[:8]}{suffix}"
    file_path = None
    try:
        audio_url = await storage_service.upload_bytes(
            audio_bytes,
            filename=filename,
            content_type=audio.content_type,
            prefix="voice-clone",
        )
    except StorageNotConfigured:
        if not settings.PUBLIC_HOST:
            raise HTTPException(status_code=503, detail="声音克隆需要配置 OSS 或 PUBLIC_HOST 公网地址")

        static_dir = os.path.join(os.path.dirname(__file__), "..", "..", "static", "temp")
        os.makedirs(static_dir, exist_ok=True)
        file_path = os.path.join(static_dir, filename)
        with open(file_path, "wb") as f:
            f.write(audio_bytes)
        audio_url = f"{settings.PUBLIC_HOST.rstrip('/')}/static/temp/{filename}"

    try:
        voice_id = await voice_service.create_cloned_voice(
            audio_url=audio_url,
            prefix=prefix,
            target_model="cosyvoice-v2",
        )
    finally:
        # 克隆完成后删除临时文件（延迟 30 秒，确保 DashScope 有时间读取）
        async def _cleanup():
            await asyncio.sleep(30)
            if file_path:
                try:
                    os.unlink(file_path)
                except Exception:
                    pass
        if file_path:
            asyncio.create_task(_cleanup())

    if not voice_id:
        raise HTTPException(status_code=502, detail="声音克隆未完成，请确认公网音频 URL 可访问且音频清晰、时长 10–30 秒")

    return {
        "success": True,
        "voice_id": voice_id,
        "message": f"克隆成功！专属音色已创建",
    }


_PRESET_VOICES = [
    {"id": "longxiaochun_v2", "label": "清冷女声", "rate": 0.9,  "pitch": 1.05, "gender": "female"},
    {"id": "longwan_v2",         "label": "温柔女声", "rate": 0.88, "pitch": 1.1,  "gender": "female"},
    {"id": "longcheng_v2",    "label": "磁性男声", "rate": 0.85, "pitch": 0.78, "gender": "male"},
    {"id": "longhua_v2",      "label": "活力女声", "rate": 1.05, "pitch": 1.15, "gender": "female"},
    {"id": "longyuan_v2",     "label": "活泼男声", "rate": 1.0,  "pitch": 1.0,  "gender": "male"},
]


@router.post("/memory/query")
async def query_character_memory(req: MemoryQueryRequest):
    """查询角色记忆 (向量检索)"""
    raise HTTPException(status_code=501, detail="角色记忆向量检索尚未接入，生产模式不会返回 mock 记忆")
