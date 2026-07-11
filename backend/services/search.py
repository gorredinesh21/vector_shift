"""Web search tool (DuckDuckGo, no API key) with an LLM fallback.

Priority order for results: news articles first, then blog-style pages, then
everything else. News comes from DuckDuckGo's news vertical; blogs are detected
by URL heuristics on the general results.
"""
import logging

import config
from services import hf_llm, structured

log = logging.getLogger(__name__)

# URL hints that usually mean a blog / article (vs. a homepage, shop, or app)
_BLOG_HINTS = (
    "blog", "/news", "news.", "article", "/posts/", "/post/",
    "medium.com", "substack.com", "wordpress", "dev.to", "hashnode",
    "ghost.io", "/20", "/story/", "journal",
)


def _is_bloglike(url: str) -> bool:
    u = (url or "").lower()
    return any(h in u for h in _BLOG_HINTS)


def _ddg_news(query: str, n: int) -> list[str]:
    from ddgs import DDGS
    out = []
    with DDGS() as ddgs:
        for r in ddgs.news(query, max_results=n):
            href = r.get("url") or r.get("href")
            if href:
                out.append(href)
    return out


def _ddg_text(query: str, n: int) -> list[str]:
    from ddgs import DDGS
    out = []
    with DDGS() as ddgs:
        for r in ddgs.text(query, max_results=n):
            href = r.get("href") or r.get("link") or r.get("url")
            if href:
                out.append(href)
    return out


def _dedup(urls: list[str]) -> list[str]:
    seen, out = set(), []
    for u in urls:
        if u and u not in seen:
            seen.add(u)
            out.append(u)
    return out


def _llm_fallback(query: str, max_results: int) -> list[str]:
    """If search fails, ask the LLM to propose likely, real URLs (blogs/news)."""
    system = "You are a web research assistant. Return ONLY a JSON array of full https URLs."
    prompt = f"List up to {max_results} news articles or blog posts to research: {query}"
    text = hf_llm.complete(system, prompt, max_tokens=300, temperature=0.3)
    return [u for u in structured.parse_str_list(text) if u.startswith("http")][:max_results]


def search_links(query: str, max_results: int = config.MAX_SCRAPE_SITES) -> list[str]:
    """Return URLs for a query, prioritizing news + blogs, then other sites."""
    print(f"[web] searching (news+blogs first): {query!r} ...", flush=True)
    news, text = [], []
    try:
        news = _ddg_news(query, max_results)
        print(f"[web] {len(news)} news result(s)", flush=True)
    except Exception as exc:  # noqa: BLE001
        print(f"[web] news search failed ({str(exc)[:70]})", flush=True)
    try:
        text = _ddg_text(query, max_results)
        print(f"[web] {len(text)} general result(s)", flush=True)
    except Exception as exc:  # noqa: BLE001
        print(f"[web] text search failed ({str(exc)[:70]})", flush=True)

    if not news and not text:
        print("[web] no results; using LLM fallback for URLs", flush=True)
        return _llm_fallback(query, max_results)

    blogs = [u for u in text if _is_bloglike(u)]
    others = [u for u in text if not _is_bloglike(u)]
    # news first, then blog-style pages, then the rest
    ordered = _dedup(news + blogs + others)
    return ordered[:max_results]


if __name__ == "__main__":  # live smoke test (personal laptop)
    import sys
    for u in search_links(sys.argv[1] if len(sys.argv) > 1 else "AI in private equity"):
        print(u)
