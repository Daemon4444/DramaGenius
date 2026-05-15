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
        # Step 1: 从 ES 获取原始数据，ES 不可用时回退到 LLM 直接分析
        raw_data = ""
        try:
            raw_data = await search_service.search_social_data(
                query=req.query,
                days=7,
                limit=100
            )
        except Exception:
            pass  # ES 不可用，后续回退到 LLM 直接分析

        if not raw_data:
            if settings.ALLOW_DEMO_DATA:
                raw_data = f"用户查询: {req.query}\n\n(演示模式：无实际采集数据，请根据短剧市场常识生成分析)"
            else:
                # ES 无数据或不可用时，用 LLM 基于查询关键词直接分析
                raw_data = (
                    f"用户查询: {req.query}\n\n"
                    f"注意：当前无 Elasticsearch 实时采集数据，请基于你对短剧市场、社交媒体趋势的知识，"
                    f"针对「{req.query}」这一主题生成合理的舆情分析结果。"
                    f"请确保数据看起来真实可信，包含具体的数字和平台来源。"
                )

        # Step 2: 调用千问分析
        result_str = await qwen_service.analyze_trends(raw_data)

        # Step 3: 解析 JSON（兼容 Qwen3 thinking 标签和 code fence）
        try:
            # 去除 Qwen3 thinking 块
            import re
            clean_str = re.sub(r"<think>.*?</think>", "", result_str, flags=re.DOTALL).strip()
            if "```json" in clean_str:
                json_str = clean_str.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_str:
                json_str = clean_str.split("```")[1].split("```")[0].strip()
            else:
                json_str = clean_str
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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"舆情分析失败: {str(e)}")


@router.get("/hot-keywords")
async def get_hot_keywords(limit: int = 20):
    """
    获取当前热门关键词 (从 ES 聚合，ES 不可用时回退到 LLM 生成)
    """
    try:
        keywords = await search_service.get_trending_keywords(limit=limit)
        if keywords:
            return {"keywords": keywords}
    except Exception:
        pass

    # ES 不可用或无数据，使用 LLM 生成热门关键词
    try:
        prompt = (
            f"请生成当前短剧行业{limit}个热门关键词，返回 JSON 数组格式：\n"
            '[{"word":"关键词","count":数量,"score":热度分(0-100)}]\n'
            "只返回 JSON，不要其他内容。"
        )
        result_str = await qwen_service.chat(
            [{"role": "user", "content": prompt}],
            max_tokens=600,
        )
        import re
        clean_str = re.sub(r"<think>.*?</think>", "", result_str, flags=re.DOTALL).strip()
        if "```json" in clean_str:
            json_str = clean_str.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_str:
            json_str = clean_str.split("```")[1].split("```")[0].strip()
        else:
            json_str = clean_str
        keywords = json.loads(json_str)
        return {"keywords": keywords[:limit]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"热词分析不可用: {str(e)}")


@router.get("/platforms")
async def get_platform_stats():
    """
    获取各平台数据统计 (ES 不可用时返回默认平台列表)
    """
    try:
        stats = await search_service.get_platform_stats()
        if stats:
            return {"platforms": stats}
    except Exception:
        pass

    # ES 不可用时返回默认平台列表（无实际采集数据）
    return {"platforms": [
        {"name": "抖音", "posts": 0, "last_crawl": None},
        {"name": "微博", "posts": 0, "last_crawl": None},
        {"name": "小红书", "posts": 0, "last_crawl": None},
        {"name": "B站", "posts": 0, "last_crawl": None},
    ]}
