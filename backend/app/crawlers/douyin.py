"""
抖音爬虫 - 基于 Scrapling
使用 StealthyFetcher 绕过反爬，采集短剧相关热门视频
"""

import asyncio
import re
from datetime import datetime
from typing import List, Optional
from urllib.parse import quote

from scrapling.fetchers import StealthyFetcher
from app.crawlers.base import BaseCrawler, SocialPost


class DouyinCrawler(BaseCrawler):
    """抖音爬虫 - 抓取短剧相关热门视频和评论"""

    platform = "douyin"
    
    # 短剧相关搜索关键词
    DRAMA_KEYWORDS = [
        "短剧", "微短剧", "竖屏剧",
        "霸总", "甜宠", "逆袭", "重生", "穿越"
    ]
    
    def __init__(self):
        super().__init__()
        self.search_url = "https://www.douyin.com/search"
        self.hot_url = "https://www.douyin.com/hot"
    
    async def crawl_trending(self, limit: int = 50) -> List[SocialPost]:
        """抓取热门短剧视频"""
        posts = []
        
        try:
            # 使用 StealthyFetcher 绕过反爬
            page = StealthyFetcher.fetch(
                self.hot_url,
                headless=True,
                network_idle=True,
                google_search=False,
                wait_selector='.hot-list-item'  # 等待热榜加载
            )
            
            # 解析热榜 - 使用实测有效的选择器
            hot_items = page.css('a[href*="/video/"]')
            
            for item in hot_items[:limit]:
                try:
                    # 标题
                    title_elem = item.css('.title, [class*="title"]::text')
                    title = title_elem.get() if title_elem else ""
                    
                    # 检查是否与短剧相关
                    is_drama_related = any(kw in title for kw in self.DRAMA_KEYWORDS)
                    
                    # 链接
                    link_elem = item.css('a::attr(href)')
                    video_url = link_elem.get() if link_elem else ""
                    if video_url and not video_url.startswith('http'):
                        video_url = f"https://www.douyin.com{video_url}"
                    
                    # 热度
                    hot_elem = item.css('.hot-index, [class*="count"]::text')
                    hot_value = self._parse_count(hot_elem.get()) if hot_elem else 0
                    
                    if title:
                        posts.append(SocialPost(
                            platform=self.platform,
                            post_id=f"hot_{hash(title) % 10000000}",
                            author="抖音热榜",
                            author_id="hot",
                            content=f"{'🔥 ' if is_drama_related else ''}{title}",
                            url=video_url,
                            published_at=datetime.now(),
                            likes=0,
                            comments=0,
                            shares=0,
                            views=hot_value,
                            raw_data={
                                "type": "hot",
                                "is_drama": is_drama_related
                            }
                        ))
                        
                except Exception as e:
                    print(f"[Douyin] 解析热榜项失败: {e}")
                    continue
                    
        except Exception as e:
            print(f"[Douyin] 抓取热榜失败: {e}")
        
        return posts

    async def search(self, keyword: str, limit: int = 50) -> List[SocialPost]:
        """搜索抖音视频"""
        posts = []
        
        try:
            search_url = f"{self.search_url}/{quote(keyword)}?type=video"
            
            # 使用 StealthyFetcher 绕过反爬
            page = StealthyFetcher.fetch(
                search_url,
                headless=True,
                network_idle=True,
                google_search=False,
                timeout=30
            )
            
            # 解析搜索结果
            video_cards = page.css('[class*="video-card"], [class*="search-result-card"], .search-result-item')
            
            for card in video_cards[:limit]:
                try:
                    # 标题/描述
                    title_elem = card.css('[class*="title"]::text, .desc::text')
                    title = title_elem.get() if title_elem else ""
                    title = re.sub(r'\s+', ' ', title).strip()
                    
                    # 作者
                    author_elem = card.css('[class*="author"]::text, .nickname::text')
                    author = author_elem.get() if author_elem else "未知"
                    
                    # 链接
                    link_elem = card.css('a::attr(href)')
                    video_url = link_elem.get() if link_elem else ""
                    if video_url and not video_url.startswith('http'):
                        video_url = f"https://www.douyin.com{video_url}"
                    
                    # 提取视频ID
                    video_id = ""
                    if video_url:
                        match = re.search(r'/video/(\d+)', video_url)
                        if match:
                            video_id = match.group(1)
                    
                    # 播放量/点赞数
                    stats_elem = card.css('[class*="count"]::text, [class*="like"]::text')
                    stats = [self._parse_count(s.get()) for s in stats_elem] if stats_elem else [0]
                    likes = stats[0] if stats else 0
                    
                    if title:
                        posts.append(SocialPost(
                            platform=self.platform,
                            post_id=video_id or str(hash(title) % 10000000),
                            author=author,
                            author_id="",
                            content=title,
                            url=video_url,
                            published_at=datetime.now(),
                            likes=likes,
                            comments=0,
                            shares=0,
                            views=0,
                            raw_data={"keyword": keyword}
                        ))
                        
                except Exception as e:
                    print(f"[Douyin] 解析视频卡片失败: {e}")
                    continue
                    
        except Exception as e:
            print(f"[Douyin] 搜索失败: {e}")
        
        return posts
    
    async def crawl_topic(self, topic: str, limit: int = 50) -> List[SocialPost]:
        """抓取话题视频"""
        return await self.search(f"#{topic}", limit)
    
    def _parse_count(self, text: str) -> int:
        """解析数字，支持 '1.2w' / '1.2万' 格式"""
        if not text:
            return 0
        text = text.strip().lower()
        try:
            if 'w' in text or '万' in text:
                num = float(re.sub(r'[w万]', '', text))
                return int(num * 10000)
            elif '亿' in text:
                num = float(text.replace('亿', ''))
                return int(num * 100000000)
            else:
                return int(re.sub(r'\D', '', text) or 0)
        except:
            return 0


# Celery 任务
async def crawl_douyin_drama(keyword: Optional[str] = None, limit: int = 50):
    """Celery 异步任务：采集抖音短剧内容"""
    crawler = DouyinCrawler()
    
    if keyword:
        posts = await crawler.search(keyword, limit)
    else:
        # 默认抓取热榜 + 多个关键词
        posts = await crawler.crawl_trending(limit // 2)
        for kw in DouyinCrawler.DRAMA_KEYWORDS[:2]:
            posts.extend(await crawler.search(kw, limit // 4))
    
    # 存入 Elasticsearch
    from ..services.search_service import SearchService
    search_service = SearchService()
    
    for post in posts:
        await search_service.index_social_post(post)
    
    return {"platform": "douyin", "count": len(posts)}


douyin_crawler = DouyinCrawler()


if __name__ == "__main__":
    async def test():
        crawler = DouyinCrawler()
        
        print("=== 测试抖音热榜 ===")
        posts = await crawler.crawl_trending(limit=5)
        for p in posts:
            print(f"[{p.author}] {p.content[:60]}...")
            print(f"  播放:{p.views}")
            print()
        
        print("=== 测试抖音搜索 ===")
        posts = await crawler.search("短剧", limit=5)
        for p in posts:
            print(f"[{p.author}] {p.content[:60]}...")
            print()
    
    asyncio.run(test())
