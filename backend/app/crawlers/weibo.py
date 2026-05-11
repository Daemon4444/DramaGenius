"""
微博爬虫 - 基于 Scrapling
使用 StealthyFetcher 绕过反爬，采集短剧相关热搜和帖子
"""

import asyncio
import re
from datetime import datetime
from typing import List, Optional
from urllib.parse import quote

from scrapling.fetchers import StealthyFetcher, Fetcher
from app.crawlers.base import BaseCrawler, SocialPost


class WeiboCrawler(BaseCrawler):
    """微博爬虫 - 抓取短剧相关热搜和帖子"""

    platform = "weibo"
    
    # 短剧相关搜索关键词
    DRAMA_KEYWORDS = [
        "短剧", "微短剧", "竖屏剧", "霸总短剧",
        "甜宠短剧", "逆袭短剧", "重生短剧"
    ]
    
    def __init__(self):
        super().__init__()
        self.search_url = "https://s.weibo.com/weibo"
        self.hot_search_url = "https://s.weibo.com/top/summary"
    
    async def crawl_trending(self, limit: int = 50) -> List[SocialPost]:
        """抓取微博热搜中的短剧相关话题"""
        posts = []
        
        try:
            # 使用 StealthyFetcher 绕过反爬
            page = StealthyFetcher.fetch(
                self.hot_search_url,
                headless=True,
                network_idle=True,
                google_search=False
            )
            
            # 解析热搜榜
            hot_items = page.css('td.td-02 a')
            
            for item in hot_items[:limit]:
                title = item.css('::text').get()
                if not title:
                    continue
                    
                # 检查是否与短剧相关
                is_drama_related = any(kw in title for kw in self.DRAMA_KEYWORDS)
                if not is_drama_related:
                    continue
                
                href = item.css('::attr(href)').get()
                
                posts.append(SocialPost(
                    platform=self.platform,
                    post_id=f"hot_{hash(title) % 10000000}",
                    author="微博热搜",
                    author_id="hot_search",
                    content=f"【热搜】{title}",
                    url=f"https://s.weibo.com{href}" if href else "",
                    published_at=datetime.now(),
                    likes=0,
                    comments=0,
                    shares=0,
                    views=0,
                    raw_data={"type": "hot_search", "title": title}
                ))
                
        except Exception as e:
            print(f"[Weibo] 抓取热搜失败: {e}")
        
        return posts

    async def search(self, keyword: str, limit: int = 50) -> List[SocialPost]:
        """搜索微博帖子"""
        posts = []
        
        try:
            search_url = f"{self.search_url}?q={quote(keyword)}&typeall=1&suball=1&timescope=custom:2024-01-01-0:2026-12-31-0"
            
            # 使用 StealthyFetcher 绕过反爬
            page = StealthyFetcher.fetch(
                search_url,
                headless=True,
                network_idle=True,
                google_search=False
            )
            
            # 解析搜索结果
            cards = page.css('.card-wrap')
            
            for card in cards[:limit]:
                try:
                    # 作者信息
                    author_elem = card.css('.name::text')
                    author = author_elem.get() if author_elem else "未知"
                    
                    # 内容
                    content_elem = card.css('.txt')
                    content = content_elem.get_text() if content_elem else ""
                    content = re.sub(r'\s+', ' ', content).strip()
                    
                    # 链接
                    link_elem = card.css('.from a::attr(href)')
                    post_url = link_elem.get() if link_elem else ""
                    if post_url and not post_url.startswith('http'):
                        post_url = f"https://weibo.com{post_url}"
                    
                    # 提取帖子ID
                    post_id = ""
                    if post_url:
                        match = re.search(r'/(\d+)', post_url)
                        if match:
                            post_id = match.group(1)
                    
                    # 互动数据
                    actions = card.css('.card-act li')
                    reposts = self._parse_count(actions[0].css('::text').get()) if len(actions) > 0 else 0
                    comments = self._parse_count(actions[1].css('::text').get()) if len(actions) > 1 else 0
                    likes = self._parse_count(actions[2].css('::text').get()) if len(actions) > 2 else 0
                    
                    # 发布时间
                    time_elem = card.css('.from::text')
                    time_str = time_elem.get() if time_elem else ""
                    published_at = self._parse_weibo_time(time_str)
                    
                    if content:
                        posts.append(SocialPost(
                            platform=self.platform,
                            post_id=post_id or str(hash(content) % 10000000),
                            author=author,
                            author_id="",
                            content=content,
                            url=post_url,
                            published_at=published_at,
                            likes=likes,
                            comments=comments,
                            shares=reposts,
                            views=0,
                            raw_data={"keyword": keyword}
                        ))
                        
                except Exception as e:
                    print(f"[Weibo] 解析帖子失败: {e}")
                    continue
                    
        except Exception as e:
            print(f"[Weibo] 搜索失败: {e}")
        
        return posts
    
    async def crawl_topic(self, topic: str, limit: int = 50) -> List[SocialPost]:
        """抓取话题下的帖子"""
        # 话题搜索复用 search 方法
        return await self.search(f"#{topic}#", limit)
    
    def _parse_count(self, text: str) -> int:
        """解析数字，支持 '1.2万' 格式"""
        if not text:
            return 0
        text = text.strip()
        try:
            if '万' in text:
                num = float(text.replace('万', ''))
                return int(num * 10000)
            elif '亿' in text:
                num = float(text.replace('亿', ''))
                return int(num * 100000000)
            else:
                return int(re.sub(r'\D', '', text) or 0)
        except:
            return 0
    
    def _parse_weibo_time(self, time_str: str) -> datetime:
        """解析微博时间格式"""
        now = datetime.now()
        time_str = time_str.strip()
        
        try:
            if '分钟前' in time_str:
                minutes = int(re.search(r'(\d+)', time_str).group(1))
                return datetime.fromtimestamp(now.timestamp() - minutes * 60)
            elif '小时前' in time_str:
                hours = int(re.search(r'(\d+)', time_str).group(1))
                return datetime.fromtimestamp(now.timestamp() - hours * 3600)
            elif '今天' in time_str:
                time_part = re.search(r'(\d+:\d+)', time_str)
                if time_part:
                    return datetime.strptime(f"{now.strftime('%Y-%m-%d')} {time_part.group(1)}", '%Y-%m-%d %H:%M')
            elif '昨天' in time_str:
                yesterday = datetime.fromtimestamp(now.timestamp() - 86400)
                time_part = re.search(r'(\d+:\d+)', time_str)
                if time_part:
                    return datetime.strptime(f"{yesterday.strftime('%Y-%m-%d')} {time_part.group(1)}", '%Y-%m-%d %H:%M')
            elif re.match(r'\d{4}年\d{1,2}月\d{1,2}日', time_str):
                return datetime.strptime(time_str.split()[0], '%Y年%m月%d日')
            elif re.match(r'\d{1,2}月\d{1,2}日', time_str):
                return datetime.strptime(f"{now.year}年{time_str.split()[0]}", '%Y年%m月%d日')
        except:
            pass
        
        return now


# Celery 任务
async def crawl_weibo_drama(keyword: Optional[str] = None, limit: int = 50):
    """Celery 异步任务：采集微博短剧内容"""
    crawler = WeiboCrawler()
    
    if keyword:
        posts = await crawler.search(keyword, limit)
    else:
        # 默认抓取热搜 + 多个关键词
        posts = await crawler.crawl_trending(limit // 2)
        for kw in WeiboCrawler.DRAMA_KEYWORDS[:2]:
            posts.extend(await crawler.search(kw, limit // 4))
    
    # 存入 Elasticsearch
    from ..services.search_service import SearchService
    search_service = SearchService()
    
    for post in posts:
        await search_service.index_social_post(post)
    
    return {"platform": "weibo", "count": len(posts)}


weibo_crawler = WeiboCrawler()


if __name__ == "__main__":
    async def test():
        crawler = WeiboCrawler()
        
        print("=== 测试微博搜索 ===")
        posts = await crawler.search("短剧", limit=5)
        for p in posts:
            print(f"[{p.author}] {p.content[:80]}...")
            print(f"  点赞:{p.likes} 评论:{p.comments} 转发:{p.shares}")
            print()
    
    asyncio.run(test())
