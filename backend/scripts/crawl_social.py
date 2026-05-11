#!/usr/bin/env python
"""Run real social crawlers and write results to Elasticsearch."""
import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.crawlers.bilibili import crawl_bilibili_drama
from app.crawlers.douyin import crawl_douyin_drama
from app.crawlers.weibo import crawl_weibo_drama
from app.crawlers.xiaohongshu import crawl_xiaohongshu_drama
from app.services.search_service import search_service

CRAWLERS = {
    "bilibili": crawl_bilibili_drama,
    "douyin": crawl_douyin_drama,
    "weibo": crawl_weibo_drama,
    "xiaohongshu": crawl_xiaohongshu_drama,
}


async def main() -> int:
    parser = argparse.ArgumentParser(description="Crawl social data into Elasticsearch")
    parser.add_argument("--keyword", default="短剧", help="search keyword")
    parser.add_argument("--limit", type=int, default=20, help="per-platform limit")
    parser.add_argument(
        "--platform",
        action="append",
        choices=sorted(CRAWLERS),
        help="platform to crawl; repeatable. Defaults to all platforms.",
    )
    args = parser.parse_args()

    platforms = args.platform or sorted(CRAWLERS)
    total = 0
    failures: list[str] = []
    for platform in platforms:
        try:
            result = await CRAWLERS[platform](keyword=args.keyword, limit=args.limit)
            count = result.get("count", 0) if isinstance(result, dict) else int(result or 0)
            total += count
            print(f"{platform}: indexed {count}")
        except Exception as exc:
            failures.append(f"{platform}: {exc}")
            print(f"{platform}: failed: {exc}", file=sys.stderr)

    await search_service.close()
    if failures and total == 0:
        return 2
    print(f"total indexed: {total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
