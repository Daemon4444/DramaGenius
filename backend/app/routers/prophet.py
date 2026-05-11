"""
Prophet 舆情分析路由
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.models.database import get_db
from app.models.project import ProphetSnapshot
from app.services.llm_service import qwen_service
from app.services.search_service import search_service
from app.utils.auth import get_current_user_id_optional
from app.config import get_settings

router = APIRouter()
settings = get_settings()


class AnalyzeRequest(BaseModel):
    query: str
    project_id: Optional[str] = None
    use_cache: bool = True  # 是否使用缓存的 ES 数据


class AnalyzeResponse(BaseModel):
    keywords: list
    trends: list
    sentiment: dict
    suggestions: list
    hot_topics: list


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_trends(
    req: AnalyzeRequest,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    分析舆情趋势

    流程:
    1. 从 ES 检索相关社媒数据
    2. 使用千问分析数据
    3. 返回结构化结果
    """
    try:
        # Step 1: 从 ES 获取原始数据
        raw_data = await search_service.search_social_data(
            query=req.query,
            days=7,
            limit=100
        )

        if not raw_data:
            if settings.ALLOW_DEMO_DATA:
                raw_data = f"用户查询: {req.query}\n\n(演示模式：无实际采集数据，请根据短剧市场常识生成分析)"
            else:
                raise HTTPException(
                    status_code=424,
                    detail="Elasticsearch 中没有可分析的真实舆情数据，请先运行爬虫采集并写入 ES"
                )

        # Step 2: 调用千问分析
        result_str = await qwen_service.analyze_trends(raw_data)

        # Step 3: 解析 JSON
        # 尝试提取 JSON 块
        try:
            if "```json" in result_str:
                json_str = result_str.split("```json")[1].split("```")[0].strip()
            elif "```" in result_str:
                json_str = result_str.split("```")[1].split("```")[0].strip()
            else:
                json_str = result_str
            result = json.loads(json_str)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=502, detail="舆情分析结果不是合法 JSON，请重试") from exc

        # Step 4: 如果有 project_id，保存快照
        if req.project_id and user_id and not settings.DEV_SKIP_DB:
            snapshot = ProphetSnapshot(
                project_id=req.project_id,
                query=req.query,
                keywords=result.get("keywords"),
                trends=result.get("trends"),
                sentiment=result.get("sentiment"),
                suggestions=result.get("suggestions"),
                hot_topics=result.get("hot_topics")
            )
            db.add(snapshot)
            await db.commit()

        return AnalyzeResponse(
            keywords=result.get("keywords", []),
            trends=result.get("trends", []),
            sentiment=result.get("sentiment", {}),
            suggestions=result.get("suggestions", []),
            hot_topics=result.get("hot_topics", [])
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"舆情分析失败: {str(e)}")


@router.get("/hot-keywords")
async def get_hot_keywords(limit: int = 20):
    """
    获取当前热门关键词 (从 ES 聚合)
    """
    try:
        keywords = await search_service.get_trending_keywords(limit=limit)
        return {"keywords": keywords}
    except Exception as e:
        raise HTTPException(status_code=424, detail=f"Elasticsearch 热词聚合不可用: {str(e)}")


@router.get("/platforms")
async def get_platform_stats():
    """
    获取各平台数据统计
    """
    try:
        stats = await search_service.get_platform_stats()
        return {"platforms": stats}
    except Exception as e:
        raise HTTPException(status_code=424, detail=f"Elasticsearch 平台统计不可用: {str(e)}")
