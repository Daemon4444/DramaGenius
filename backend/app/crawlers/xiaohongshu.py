"""
小红书爬虫 - 基于 Scrapling
使用 StealthyFetcher 绕过反爬，采集短剧相关笔记
"""

import asyncio
import re
from datetime import datetime
from typing import List, Optional
from urllib.parse import quote

from scrapling.fetchers import StealthyFetcher
from app.crawlers.base import BaseCrawler, SocialPost


class XiaohongshuCrawler(BaseCrawler):
    """小红书爬虫 - 抓取短剧相关笔记和推荐"""

    platform = "xiaohongshu"
    
    # 短剧相关搜索关键词
    DRAMA_KEYWORDS = [
        "短剧推荐", "微短剧", "竖屏短剧",
        "霸总短剧", "甜宠剧", "高甜剧", "追剧日记"
    ]
    
    def __init__(self):
        super().__init__()
        self.search_url = "https://www.xiaohongshu.com/search_result"
        self.explore_url = "https://www.xiaohongshu.com/explore"
    
    async def crawl_trending(self, limit: int = 50) -> List[SocialPost]:
        """抓取发现页短剧相关内容"""
        posts = []
        
        try:
            # 使用 StealthyFetcher 绕过反爬
            page = StealthyFetcher.fetch(
                self.explore_url,
                headless=True,
                network_idle=True,
                google_search=False,
                timeout=30
            )
            
            # 解析笔记卡片 - 使用实测有效的选择器
            note_cards = page.css('[class*="note"]')
            
            for card in note_cards[:limit]:
                try:
                    # 标题
                    title_elem = card.css('[class*="title"]::text, .note-title::text')
                    title = title_elem.get() if title_elem else ""
                    
                    # 检查是否与短剧相关
                    is_drama_related = any(kw in title for kw in self.DRAMA_KEYWORDS)
                    
                    # 作者
                    author_elem = card.css('[class*="author"]::text, .author-name::text')
                    author = author_elem.get() if author_elem else "未知"
                    
                    # 链接
                    link_elem = card.css('a::attr(href)')
                    note_url = link_elem.get() if link_elem else ""
                    if note_url and not note_url.startswith('http'):
                        note_url = f"https://www.xiaohongshu.com{note_url}"
                    
                    # 点赞数
                    like_elem = card.css('[class*="like"]::text, .like-count::text')
                    likes = self._parse_count(like_elem.get()) if like_elem else 0
                    
                    if title:
                        posts.append(SocialPost(
                            platform=self.platform,
                            post_id=f"explore_{hash(title) % 10000000}",
                            author=author,
                            author_id="",
                            content=title,
                            url=note_url,
                            published_at=datetime.now(),
                            likes=likes,
                            comments=0,
                            shares=0,
                            views=0,
                            raw_data={
                                "type": "explore",
                                "is_drama": is_drama_related
                            }
                        ))
                        
                except Exception as e:
                    print(f"[Xiaohongshu] 解析笔记失败: {e}")
                    continue
                    
        except Exception as e:
            print(f"[Xiaohongshu] 抓取发现页失败: {e}")
        
        return posts

    async def search(self, keyword: str, limit: int = 50) -> List[SocialPost]:
        """搜索小红书笔记"""
        posts = []
        
        try:
            search_url = f"{self.search_url}?keyword={quote(keyword)}&type=note"
            
            # 使用 StealthyFetcher 绕过反爬
            page = StealthyFetcher.fetch(
                search_url,
                headless=True,
                network_idle=True,
                google_search=False,
                timeout=30
            )
            
            # 解析搜索结果
            note_cards = page.css('[class*="note-item"], .note-card, section[id]')
            
            for card in note_cards[:limit]:
                try:
                    # 标题
                    title_elem = card.css('[class*="title"]::text, .title::text, span[class*="title"]::text')
                    title = title_elem.get() if title_elem else ""
                    title = re.sub(r'\s+', ' ', title).strip()
                    
                    # 内容摘要 (小红书笔记正文)
                    desc_elem = card.css('[class*="desc"]::text, .content::text')
                    desc = desc_elem.get() if desc_elem else ""
                    
                    content = title or desc
                    
                    # 作者
                    author_elem = card.css('[class*="author"]::text, .nickname::text, [class*="name"]::text')
                    author = author_elem.get() if author_elem else "未知"
                    
                    # 链接
                    link_elem = card.css('a::attr(href)')
                    note_url = link_elem.get() if link_elem else ""
                    if note_url and not note_url.startswith('http'):
                        note_url = f"https://www.xiaohongshu.com{note_url}"
                    
                    # 提取笔记ID
                    note_id = ""
                    if note_url:
                        match = re.search(r'/explore/([a-f0-9]+)', note_url)
                        if not match:
                            match = re.search(r'/note/([a-f0-9]+)', note_url)
                        if match:
                            note_id = match.group(1)
                    
                    # 点赞数
                    like_elem = card.css('[class*="like"]::text, .like-count::text, [class*="count"]::text')
                    likes = self._parse_count(like_elem.get()) if like_elem else 0
                    
                    # 评论数
                    comment_elem = card.css('[class*="comment"]::text')
                    comments = self._parse_count(comment_elem.get()) if comment_elem else 0
                    
                    if content:
                        posts.append(SocialPost(
                            platform=self.platform,
                            post_id=note_id or str(hash(content) % 10000000),
                            author=author,
                            author_id="",
                            content=content,
                            url=note_url,
                            published_at=datetime.now(),
                            likes=likes,
                            comments=comments,
                            shares=0,
                            views=0,
                            raw_data={"keyword": keyword}
                        ))
                        
                except Exception as e:
                    print(f"[Xiaohongshu] 解析笔记失败: {e}")
                    continue
                    
        except Exception as e:
            print(f"[Xiaohongshu] 搜索失败: {e}")
        
        return posts
    
    async def crawl_topic(self, topic: str, limit: int = 50) -> List[SocialPost]:
        """抓取话题下的笔记"""
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
            elif 'k' in text:
                num = float(text.replace('k', ''))
                return int(num * 1000)
            else:
                return int(re.sub(r'\D', '', text) or 0)
        except:
            return 0


# Celery 任务
async def crawl_xiaohongshu_drama(keyword: Optional[str] = None, limit: int = 50):
    """Celery 异步任务：采集小红书短剧内容"""
    crawler = XiaohongshuCrawler()
    
    if keyword:
        posts = await crawler.search(keyword, limit)
    else:
        # 默认抓取发现页 + 多个关键词
        posts = await crawler.crawl_trending(limit // 2)
        for kw in XiaohongshuCrawler.DRAMA_KEYWORDS[:2]:
            posts.extend(await crawler.search(kw, limit // 4))
    
    # 存入 Elasticsearch
    from ..services.search_service import SearchService
    search_service = SearchService()
    
    for post in posts:
        await search_service.index_social_post(post)
    
    return {"platform": "xiaohongshu", "count": len(posts)}


xiaohongshu_crawler = XiaohongshuCrawler()


if __name__ == "__main__":
    async def test():
        crawler = XiaohongshuCrawler()
        
        print("=== 测试小红书发现页 ===")
        posts = await crawler.crawl_trending(limit=5)
        for p in posts:
            print(f"[{p.author}] {p.content[:60]}...")
            print(f"  点赞:{p.likes}")
            print()
        
        print("=== 测试小红书搜索 ===")
        posts = await crawler.search("短剧推荐", limit=5)
        for p in posts:
            print(f"[{p.author}] {p.content[:60]}...")
            print()
    
    asyncio.run(test())
