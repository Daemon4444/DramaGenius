"""
ES 搜索服务
负责从 Elasticsearch 检索和聚合社媒数据
"""
from typing import Optional
from elasticsearch import AsyncElasticsearch
from app.config import get_settings

settings = get_settings()


class SearchService:
    """Elasticsearch 搜索服务"""

    def __init__(self):
        self.client: Optional[AsyncElasticsearch] = None
        self.index_prefix = settings.ES_INDEX_PREFIX

    async def connect(self):
        """连接 ES"""
        if not self.client:
            self.client = AsyncElasticsearch([settings.ES_URL])

    async def close(self):
        """关闭连接"""
        if self.client:
            await self.client.close()

    async def search_social_data(
        self,
        query: str,
        days: int = 7,
        limit: int = 100,
        platforms: list[str] = None
    ) -> str:
        """
        搜索社媒数据

        返回格式化的文本供 LLM 分析
        """
        try:
            await self.connect()

            # 构建查询
            must = [{"match": {"content": query}}]
            if platforms:
                must.append({"terms": {"platform": platforms}})

            body = {
                "query": {
                    "bool": {
                        "must": must,
                        "filter": [
                            {"range": {"published_at": {"gte": f"now-{days}d/d"}}}
                        ]
                    }
                },
                "size": limit,
                "sort": [{"engagement.likes": "desc"}]
            }

            result = await self.client.search(
                index=f"{self.index_prefix}_social",
                body=body
            )

            # 格式化为文本
            texts = []
            for hit in result["hits"]["hits"]:
                src = hit["_source"]
                texts.append(f"[{src.get('platform', '未知')}] {src.get('content', '')[:200]}")

            return "\n".join(texts) if texts else ""

        except Exception as e:
            # ES 不可用时返回空
            print(f"ES search error: {e}")
            return ""

    async def get_trending_keywords(self, limit: int = 20) -> list[dict]:
        """
        获取热门关键词 (聚合查询)
        """
        try:
            await self.connect()

            body = {
                "size": 0,
                "query": {
                    "range": {"published_at": {"gte": "now-7d/d"}}
                },
                "aggs": {
                    "keywords": {
                        "terms": {
                            "field": "keywords",
                            "size": limit
                        }
                    }
                }
            }

            result = await self.client.search(
                index=f"{self.index_prefix}_social",
                body=body
            )

            keywords = []
            for bucket in result["aggregations"]["keywords"]["buckets"]:
                keywords.append({
                    "word": bucket["key"],
                    "count": bucket["doc_count"],
                    "score": min(100, bucket["doc_count"] // 100)
                })

            return keywords

        except Exception as e:
            print(f"ES aggregation error: {e}")
            return []

    async def get_platform_stats(self) -> list[dict]:
        """
        获取各平台数据统计
        """
        try:
            await self.connect()

            body = {
                "size": 0,
                "aggs": {
                    "platforms": {
                        "terms": {"field": "platform"},
                        "aggs": {
                            "latest": {
                                "max": {"field": "crawled_at"}
                            }
                        }
                    }
                }
            }

            result = await self.client.search(
                index=f"{self.index_prefix}_social",
                body=body
            )

            stats = []
            for bucket in result["aggregations"]["platforms"]["buckets"]:
                stats.append({
                    "name": bucket["key"],
                    "posts": bucket["doc_count"],
                    "last_crawl": bucket["latest"]["value_as_string"]
                })

            return stats

        except Exception as e:
            print(f"ES stats error: {e}")
            return []

    async def index_social_post(self, post: dict):
        """
        索引单条社媒数据
        """
        try:
            await self.connect()
            await self.client.index(
                index=f"{self.index_prefix}_social",
                body=post
            )
        except Exception as e:
            print(f"ES index error: {e}")


# 全局单例
search_service = SearchService()
