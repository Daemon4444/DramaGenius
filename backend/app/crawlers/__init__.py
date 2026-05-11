"""
DramaGenius 爬虫模块
基于 Scrapling 实现多平台社媒数据采集
"""
from .base import BaseCrawler, SocialPost
from .bilibili import BilibiliCrawler, bilibili_crawler
from .weibo import WeiboCrawler, weibo_crawler
from .douyin import DouyinCrawler, douyin_crawler
from .xiaohongshu import XiaohongshuCrawler, xiaohongshu_crawler

__all__ = [
    "BaseCrawler",
    "SocialPost",
    "BilibiliCrawler",
    "bilibili_crawler",
    "WeiboCrawler", 
    "weibo_crawler",
    "DouyinCrawler",
    "douyin_crawler",
    "XiaohongshuCrawler",
    "xiaohongshu_crawler",
]
