"""Concurrent web scraping (asyncio + httpx) with per-site error isolation.

httpx and BeautifulSoup are imported lazily so importing this module never
requires them (basic nodes still work if they aren't installed).
"""
from __future__ import annotations

import asyncio
import logging

import config

log = logging.getLogger(__name__)

_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; VectorShiftBot/1.0)"}
_MAX_CHARS = 6000  # cap text per page so prompts stay manageable


def _extract(html: str) -> str:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript", "header", "footer", "nav"]):
        tag.decompose()
    text = " ".join(soup.get_text(" ").split())
    return text[:_MAX_CHARS]


async def _scrape_one(client, url: str) -> dict:
    try:
        resp = await client.get(url, timeout=config.HTTP_TIMEOUT, follow_redirects=True)
        resp.raise_for_status()
        return {"url": url, "text": _extract(resp.text), "ok": True}
    except Exception as exc:  # noqa: BLE001 - isolate per-site failures
        log.warning("scrape failed for %s: %s", url, exc)
        return {"url": url, "text": "", "ok": False, "error": str(exc)}


async def _scrape_many(urls: list[str]) -> list[dict]:
    import httpx
    async with httpx.AsyncClient(headers=_HEADERS) as client:
        return await asyncio.gather(*(_scrape_one(client, u) for u in urls))


def scrape(urls: list[str]) -> list[dict]:
    """Scrape up to MAX_SCRAPE_SITES concurrently. Sync entry point for node executors."""
    urls = urls[: config.MAX_SCRAPE_SITES]
    if not urls:
        return []
    print(f"[web] scraping {len(urls)} site(s) concurrently ...", flush=True)
    results = asyncio.run(_scrape_many(urls))
    ok = sum(1 for r in results if r.get("ok"))
    print(f"[web] scraped {ok}/{len(urls)} ok", flush=True)
    return results


if __name__ == "__main__":  # live smoke test (personal laptop)
    import sys
    for r in scrape(sys.argv[1:] or ["https://example.com"]):
        print(r["url"], "->", r["text"][:120])
