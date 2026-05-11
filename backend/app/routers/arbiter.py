"""
Arbiter 决策引擎路由
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.models.database import get_db
from app.models.project import Decision, Project
from app.services.llm_service import qwen_service
from app.utils.auth import get_current_user_id
from app.utils.streaming import sse_response
from app.config import get_settings

router = APIRouter()
settings = get_settings()


class DesignRequest(BaseModel):
    project_id: str
    outline: str


class SimulateRequest(BaseModel):
    decision_id: str
    choice: str


class SimulateStreamRequest(BaseModel):
    """Demo 模式：无需认证的流式推演"""
    scene: str
    question: str
    choice: str
    choice_description: Optional[str] = ""


class GenerateScenarioRequest(BaseModel):
    """根据用户概念生成自定义决策场景"""
    concept: str


@router.post("/simulate-stream")
async def simulate_stream_free(req: SimulateStreamRequest):
    """
    Demo 模式：无需认证，流式推演剧情走向
    直接接受场景描述和用户选择，返回 SSE 流式剧情叙述
    """
    choice_label = f"{req.choice}（{req.choice_description}）" if req.choice_description else req.choice
    decision_desc = f"场景：{req.scene}\n问题：{req.question}"
    generator = qwen_service.simulate_decision(decision_desc, choice_label)
    return await sse_response(generator)


@router.post("/generate-scenario")
async def generate_scenario(req: GenerateScenarioRequest):
    """
    Demo 模式：无需认证，根据用户输入概念生成互动决策场景
    返回 decisions 数组，每个包含 question + choices（选项）
    """
    messages = [
        {"role": "system", "content": (
            "为互动短剧生成一个决策场景数组。输出精简JSON，只包含代码块，不加解释：\n"
            '{"decisions":[{"id":"d1","scene":"场景描述","question":"决策问题（20字内）",'
            '"choices":[{"id":"A","label":"选项名（4字内）","description":"选项描述（15字内）",'
            '"impact":"结果预告（10字内）","metrics":{"drama":85,"satisfaction":70}}]}]}\n'
            "生成1-2个决策场景，每个场景有2-3个选项。choices 数组格式固定。"
        )},
        {"role": "user", "content": f"剧情概念：{req.concept}"}
    ]
    result_str = await qwen_service.chat(
        messages, model=settings.QWEN_MODEL_PLUS, max_tokens=800
    )
    try:
        if "```json" in result_str:
            json_str = result_str.split("```json")[1].split("```")[0].strip()
        elif "```" in result_str:
            json_str = result_str.split("```")[1].split("```")[0].strip()
        else:
            json_str = result_str
        data = json.loads(json_str)
        # 确保 decisions 数组存在且每个 decision 有正确格式
        decisions = data.get("decisions", [])
        for i, dec in enumerate(decisions):
            dec.setdefault("id", f"d{i+1}")
            dec.setdefault("scene", "")
            dec.setdefault("question", "")
            # 确保 choices 格式正确
            choices = dec.get("choices", [])
            for j, opt in enumerate(choices):
                opt.setdefault("id", chr(65 + j))  # A, B, C...
                opt.setdefault("label", f"选项{j+1}")
                opt.setdefault("description", "")
                opt.setdefault("impact", "")
                opt.setdefault("metrics", {"drama": 70, "satisfaction": 70})
        return {"decisions": decisions}
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="互动场景生成结果不是合法 JSON") from exc


@router.post("/design")
async def design_decisions(
    req: DesignRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    为剧情大纲设计决策点

    流程:
    1. 调用千问分析大纲，设计决策点
    2. 解析返回的决策点和变现策略
    3. 存入数据库
    4. 返回结构化结果
    """
    try:
        if settings.DEV_SKIP_DB:
            if not settings.ALLOW_DEMO_DATA:
                raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时决策设计不可用于生产验证")
            # Demo 模式：跳过 DB 验证，直接调用 LLM
            result_str = await qwen_service.design_decisions(req.outline)
            try:
                if "```json" in result_str:
                    json_str = result_str.split("```json")[1].split("```")[0].strip()
                elif "```" in result_str:
                    json_str = result_str.split("```")[1].split("```")[0].strip()
                else:
                    json_str = result_str
                data = json.loads(json_str)
            except json.JSONDecodeError as exc:
                raise HTTPException(status_code=502, detail="决策设计结果不是合法 JSON") from exc
            return {
                "decisions": data.get("decisions", []),
                "monetization": data.get("monetization", {}),
                "engagement_hooks": data.get("engagement_hooks", [])
            }

        # 验证项目所有权
        result = await db.execute(
            select(Project).where(Project.id == req.project_id, Project.user_id == user_id)
        )
        project = result.scalar_one_or_none()
        if not project:
            raise HTTPException(status_code=404, detail="项目不存在")

        # 调用千问设计决策点
        result_str = await qwen_service.design_decisions(req.outline)

        # 解析 JSON
        try:
            if "```json" in result_str:
                json_str = result_str.split("```json")[1].split("```")[0].strip()
            elif "```" in result_str:
                json_str = result_str.split("```")[1].split("```")[0].strip()
            else:
                json_str = result_str
            data = json.loads(json_str)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=502, detail="决策设计结果不是合法 JSON") from exc

        # 保存决策点到数据库
        decisions_data = data.get("decisions", [])
        created_decisions = []

        for dec_data in decisions_data:
            decision = Decision(
                project_id=req.project_id,
                episode_number=dec_data.get("episode", 1),
                scene_desc=dec_data.get("scene", ""),
                description=dec_data.get("description", ""),
                options=dec_data.get("options"),
                unlock_condition=dec_data.get("unlock_condition", "free"),
                dramatic_weight=dec_data.get("dramatic_weight", 50)
            )
            db.add(decision)
            await db.flush()

            created_decisions.append({
                "id": str(decision.id),
                **dec_data
            })

        await db.commit()

        return {
            "decisions": created_decisions,
            "monetization": data.get("monetization", {}),
            "engagement_hooks": data.get("engagement_hooks", [])
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"决策设计失败: {str(e)}")


@router.post("/simulate")
async def simulate_decision(
    req: SimulateRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    模拟决策选择后的剧情走向 (流式输出)
    """
    try:
        if settings.DEV_SKIP_DB:
            if not settings.ALLOW_DEMO_DATA:
                raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时决策模拟不可用于生产验证")
            # Demo 模式：直接用请求参数模拟
            generator = qwen_service.simulate_decision(
                f"场景: 决策模拟\n选择: {req.choice}", req.choice
            )
            return await sse_response(generator)

        # 获取决策点
        result = await db.execute(
            select(Decision).where(Decision.id == req.decision_id)
        )
        decision = result.scalar_one_or_none()
        if not decision:
            raise HTTPException(status_code=404, detail="决策点不存在")

        # 构建决策描述
        decision_desc = f"{decision.scene_desc}\n{decision.description}"

        # 流式模拟
        generator = qwen_service.simulate_decision(decision_desc, req.choice)
        return await sse_response(generator)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"决策模拟失败: {str(e)}")


@router.get("/project/{project_id}")
async def get_project_decisions(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取项目的所有决策点"""
    if settings.DEV_SKIP_DB:
        if not settings.ALLOW_DEMO_DATA:
            raise HTTPException(status_code=503, detail="DEV_SKIP_DB=true 时决策列表不可用于生产验证")
        return {"decisions": []}

    result = await db.execute(
        select(Decision).where(Decision.project_id == project_id)
    )
    decisions = result.scalars().all()
    return {
        "decisions": [
            {
                "id": str(d.id),
                "episode_number": d.episode_number,
                "scene_desc": d.scene_desc,
                "description": d.description,
                "options": d.options,
                "unlock_condition": d.unlock_condition,
                "dramatic_weight": d.dramatic_weight
            }
            for d in decisions
        ]
    }
