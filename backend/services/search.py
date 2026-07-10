"""Web search tool (DuckDuckGo, no API key) with an LLM fallback."""
import logging

import config
from services import hf_llm, structured

log = logging.getLogger(__name__)


def _ddg(query: str, max_results: int) -> list[str]:
    from ddgs import DDGS  # imported lazily so the app loads without it installed
    links: list[str] = []
    with DDGS() as ddgs:
        for r in ddgs.text(query, max_results=max_results):
            href = r.get("href") or r.get("link") or r.get("url")
            if href:
                links.append(href)
    return links


def _llm_fallback(query: str, max_results: int) -> list[str]:
    """If search fails, ask the LLM to propose likely, real URLs."""
    system = "You are a web research assistant. Return ONLY a JSON array of full https URLs."
    prompt = f"List up to {max_results} authoritative website URLs to research: {query}"
    text = hf_llm.complete(system, prompt, max_tokens=300, temperature=0.3)
    urls = [u for u in structured.parse_str_list(text) if u.startswith("http")]
    return urls[:max_results]


def search_links(query: str, max_results: int = config.MAX_SCRAPE_SITES) -> list[str]:
    """Return real URLs for a query; fall back to LLM-proposed URLs on failure."""
    print(f"[web] searching DuckDuckGo: {query!r} …", flush=True)
    try:
        links = _ddg(query, max_results)
        if links:
            print(f"[web] found {len(links)} link(s)", flush=True)
            return links[:max_results]
        print("[web] no results; using LLM fallback for URLs", flush=True)
    except Exception as exc:  # noqa: BLE001
        print(f"[web] search failed ({str(exc)[:80]}); using LLM fallback", flush=True)
    return _llm_fallback(query, max_results)


if __name__ == "__main__":  # live smoke test (personal laptop)
    import sys
    print(search_links(sys.argv[1] if len(sys.argv) > 1 else "best vector databases 2025"))
