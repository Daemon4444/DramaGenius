"""
Bilibili 短剧区爬虫
- 使用 B站开放 API 采集短剧区视频
- 采集弹幕、评论、播放量等互动数据
"""

import asyncio
import httpx
from typing import Optional
from datetime import datetime

from .base import BaseCrawler, SocialPost


class BilibiliCrawler(BaseCrawler):
    """B站短剧区爬虫 - 基于开放API"""
    
    platform = "bilibili"
    
    # B站短剧相关分区 rid
    DRAMA_RIDS = [
        177,  # 纪录片
        11,   # 电视剧
        23,   # 电影
        167,  # 国创
    ]
    
    # 短剧相关搜索关键词
    DRAMA_KEYWORDS = [
        "短剧", "微短剧", "竖屏剧", "小程序剧",
        "霸总", "甜宠", "逆袭", "重生", "穿越"
    ]
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://api.bilibili.com"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Referer": "https://www.bilibili.com"
        }
    
    async def crawl(self, keyword: Optional[str] = None, limit: int = 50) -> list[SocialPost]:
        """
        采集B站短剧相关内容
        
        Args:
            keyword: 搜索关键词，默认使用预设短剧关键词
            limit: 采集数量上限
        """
        posts = []
        search_keywords = [keyword] if keyword else self.DRAMA_KEYWORDS[:3]
        
        async with httpx.AsyncClient(headers=self.headers, timeout=30) as client:
            for kw in search_keywords:
                try:
                    # 搜索视频
                    search_results = await self._search_videos(client, kw, limit // len(search_keywords))
                    
                    for video in search_results:
                        post = await self._parse_video(client, video)
                        if post:
                            posts.append(post)
                            
                except Exception as e:
                    print(f"[Bilibili] 采集关键词 '{kw}' 失败: {e}")
                    continue
                
                # 请求间隔，避免触发风控
                await asyncio.sleep(1)
        
        return posts[:limit]
    
    async def _search_videos(self, client: httpx.AsyncClient, keyword: str, limit: int) -> list[dict]:
        """搜索视频"""
        url = f"{self.base_url}/x/web-interface/search/type"
        params = {
            "search_type": "video",
            "keyword": keyword,
            "page": 1,
            "page_size": min(limit, 50),
            "order": "totalrank"  # 综合排序
        }
        
        resp = await client.get(url, params=params)
        data = resp.json()
        
        if data.get("code") == 0:
            return data.get("data", {}).get("result", [])
        return []
    
    async def _get_video_detail(self, client: httpx.AsyncClient, bvid: str) -> Optional[dict]:
        """获取视频详情"""
        url = f"{self.base_url}/x/web-interface/view"
        params = {"bvid": bvid}
        
        resp = await client.get(url, params=params)
        data = resp.json()
        
        if data.get("code") == 0:
            return data.get("data")
        return None
    
    async def _get_hot_comments(self, client: httpx.AsyncClient, aid: int, limit: int = 20) -> list[str]:
        """获取热门评论"""
        url = f"{self.base_url}/x/v2/reply"
        params = {
            "type": 1,  # 视频评论
            "oid": aid,
            "sort": 2,  # 按热度排序
            "ps": limit
        }
        
        try:
            resp = await client.get(url, params=params)
            data = resp.json()
            
            if data.get("code") == 0:
                replies = data.get("data", {}).get("replies", []) or []
                return [r.get("content", {}).get("message", "") for r in replies]
        except Exception:
            pass
        
        return []
    
    async def _parse_video(self, client: httpx.AsyncClient, video: dict) -> Optional[SocialPost]:
        """解析视频数据为统一格式"""
        try:
            bvid = video.get("bvid", "")
            aid = video.get("aid", 0)
            
            # 获取详细数据
            detail = await self._get_video_detail(client, bvid) if bvid else None
            
            # 获取热门评论
            comments = await self._get_hot_comments(client, aid, 10) if aid else []
            
            # 统计数据
            stat = detail.get("stat", {}) if detail else video
            
            # 构建内容：标题 + 简介 + 热门评论
            title = video.get("title", "").replace("<em class=\"keyword\">", "").replace("</em>", "")
            desc = video.get("description", "") or (detail.get("desc", "") if detail else "")
            
            content_parts = [f"【{title}】", desc]
            if comments:
                content_parts.append("\n热门评论:\n" + "\n".join(f"- {c}" for c in comments[:5]))
            
            return SocialPost(
                platform=self.platform,
                post_id=bvid or str(aid),
                author=video.get("author", "") or video.get("owner", {}).get("name", ""),
                author_id=str(video.get("mid", "") or video.get("owner", {}).get("mid", "")),
                content="\n".join(content_parts),
                url=f"https://www.bilibili.com/video/{bvid}" if bvid else "",
                published_at=datetime.fromtimestamp(video.get("pubdate", 0) or video.get("senddate", 0)),
                likes=stat.get("like", 0),
                comments=stat.get("reply", 0),
                shares=stat.get("share", 0),
                views=stat.get("view", 0),
                raw_data={
                    "bvid": bvid,
                    "aid": aid,
                    "duration": video.get("duration", 0),
                    "tags": video.get("tag", "").split(",") if video.get("tag") else [],
                    "danmaku": stat.get("danmaku", 0),
                    "favorite": stat.get("favorite", 0),
                    "coin": stat.get("coin", 0),
                }
            )
            
        except Exception as e:
            print(f"[Bilibili] 解析视频失败: {e}")
            return None


# Celery 任务
async def crawl_bilibili_drama(keyword: Optional[str] = None, limit: int = 50):
    """
    Celery 异步任务：采集B站短剧内容
    """
    crawler = BilibiliCrawler()
    posts = await crawler.crawl(keyword=keyword, limit=limit)
    
    # 存入 Elasticsearch
    from ..services.search_service import SearchService
    search_service = SearchService()
    
    for post in posts:
        await search_service.index_social_post(post)
    
    return {"platform": "bilibili", "count": len(posts)}


if __name__ == "__main__":
    # 本地测试
    async def test():
        crawler = BilibiliCrawler()
        posts = await crawler.crawl(keyword="短剧", limit=5)
        for p in posts:
            print(f"[{p.author}] {p.content[:100]}...")
            print(f"  播放:{p.views} 点赞:{p.likes} 评论:{p.comments}")
            print()
    
    asyncio.run(test())
