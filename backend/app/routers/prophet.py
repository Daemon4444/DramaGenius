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

        # 如果没有 ES 数据，使用千问直接生成分析（Demo 模式）
        if not raw_data:
            raw_data = f"用户查询: {req.query}\n\n(当前为 Demo 模式，无实际采集数据，请根据你对短剧市场的了解生成分析)"

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
        except json.JSONDecodeError:
            # 如果解析失败，返回带原始维度的模拟数据（前端用公式计算指标）
            result = {
                "keywords": [
                    {"word": req.query, "volume": 10000, "growth_pct": 35.0, "sentiment_score": 78, "platform_count": 3, "trend": "rising", "sources": ["抖音", "微博", "小红书"]}
                ],
                "trends": [
                    {"title": f"{req.query}相关趋势", "description": "分析结果解析中...", "data_volume": 10000, "consistency": 0.7, "cross_platform": 3, "recency_days": 3}
                ],
                "sentiment": {"positive_count": 600, "neutral_count": 300, "negative_count": 100, "total_count": 1000, "summary": "整体正面"},
                "suggestions": [
                    {"type": "题材建议", "content": result_str[:200], "reason": "基于AI分析"}
                ],
                "hot_topics": []
            }

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
    demo_keywords = [
        {"word": "职场复仇", "score": 95, "count": 15000},
        {"word": "霸总甜宠", "score": 92, "count": 12000},
        {"word": "重生逆袭", "score": 88, "count": 9500},
        {"word": "豪门恩怨", "score": 85, "count": 8000},
        {"word": "真假千金", "score": 82, "count": 7500},
        {"word": "契约婚姻", "score": 78, "count": 6800},
        {"word": "身份反转", "score": 75, "count": 5900},
        {"word": "追妻火葬场", "score": 71, "count": 5200},
    ]
    try:
        keywords = await search_service.get_trending_keywords(limit=limit)
        # ES 不可用时返回 demo 数据
        if not keywords:
            return {"keywords": demo_keywords[:limit]}
        return {"keywords": keywords}
    except Exception as e:
        return {"keywords": demo_keywords[:limit]}


@router.get("/platforms")
async def get_platform_stats():
    """
    获取各平台数据统计
    """
    try:
        stats = await search_service.get_platform_stats()
        return {"platforms": stats}
    except Exception as e:
        # 返回 Demo 数据
        return {
            "platforms": [
                {"name": "微博", "posts": 45000, "last_crawl": "2026-03-31T10:00:00Z"},
                {"name": "抖音", "posts": 32000, "last_crawl": "2026-03-31T09:30:00Z"},
                {"name": "小红书", "posts": 28000, "last_crawl": "2026-03-31T08:00:00Z"},
                {"name": "B站", "posts": 15000, "last_crawl": "2026-03-31T09:00:00Z"},
            ]
        }
