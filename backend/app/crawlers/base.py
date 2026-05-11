"""
爬虫基类
定义所有平台爬虫的通用接口
基于 Scrapling 实现反爬绕过
"""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, Field


class SocialPost(BaseModel):
    """社媒帖子数据模型"""
    platform: str
    post_id: str
    content: str
    author: str
    author_id: str = ""
    published_at: datetime = Field(default_factory=datetime.now)
    crawled_at: datetime = Field(default_factory=datetime.utcnow)
    url: Optional[str] = None
    
    # 互动数据 (扁平化，方便查询)
    likes: int = 0
    comments: int = 0
    shares: int = 0
    views: int = 0
    
    # 分析结果
    keywords: List[str] = []
    sentiment: float = 0.0  # -1 to 1
    
    # 媒体资源
    media_urls: List[str] = []
    
    # 原始数据 (存储平台特有字段)
    raw_data: dict = {}
    
    def to_es_doc(self) -> dict:
        """转换为 Elasticsearch 文档"""
        return {
            "platform": self.platform,
            "post_id": self.post_id,
            "content": self.content,
            "author": self.author,
            "author_id": self.author_id,
            "published_at": self.published_at.isoformat(),
            "crawled_at": self.crawled_at.isoformat(),
            "url": self.url,
            "likes": self.likes,
            "comments": self.comments,
            "shares": self.shares,
            "views": self.views,
            "keywords": self.keywords,
            "sentiment": self.sentiment,
            "engagement_score": self.likes + self.comments * 2 + self.shares * 3,
        }


class BaseCrawler(ABC):
    """爬虫基类"""

    platform: str = "unknown"

    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }

    @abstractmethod
    async def crawl_trending(self, limit: int = 50) -> List[SocialPost]:
        """抓取热门/趋势内容"""
        pass

    @abstractmethod
    async def search(self, keyword: str, limit: int = 100) -> List[SocialPost]:
        """按关键词搜索"""
        pass

    @abstractmethod
    async def crawl_topic(self, topic_id: str, limit: int = 100) -> List[SocialPost]:
        """抓取特定话题/标签的内容"""
        pass

    def extract_keywords(self, text: str) -> List[str]:
        """从文本中提取关键词 (简单实现)"""
        # TODO: 使用 jieba 或 LLM 进行关键词提取
        short_drama_keywords = [
            "短剧", "微短剧", "竖屏剧", "职场", "复仇", "逆袭", "霸总",
            "甜宠", "虐恋", "穿越", "重生", "豪门", "真假千金", "闪婚",
            "契约", "总裁", "灰姑娘", "大女主", "爽剧"
        ]
        found = []
        for kw in short_drama_keywords:
            if kw in text:
                found.append(kw)
        return found[:5]

    def estimate_sentiment(self, text: str) -> float:
        """估算情感倾向 (简单实现)"""
        positive_words = ["好看", "推荐", "爱了", "上头", "追", "神作", "绝了", "哭死", "感动"]
        negative_words = ["烂", "差", "无聊", "弃", "尬", "失望", "难看", "浪费"]

        pos_count = sum(1 for w in positive_words if w in text)
        neg_count = sum(1 for w in negative_words if w in text)

        if pos_count + neg_count == 0:
            return 0.0
        return (pos_count - neg_count) / (pos_count + neg_count)
