"""Web Scraper node — search → scrape (concurrently) → LLM summary.

Agentic flow: the LLM's search tool finds real URLs (DuckDuckGo, with an LLM-URL
fallback); we scrape up to 10 concurrently; then the LLM summarizes without losing
context.
"""
from engine.registry import register
from services import hf_llm, scraper, search


@register("webScraper")
def web_scraper_node(inputs: dict, config: dict) -> dict:
    """Research a topic/query on the web and return an LLM summary of the findings."""
    query = inputs.get("query") or config.get("query") or ""
    if not query:
        return {"summary": ""}

    try:
        max_sites = int(config.get("maxSites", 5))
    except (TypeError, ValueError):
        max_sites = 5

    urls = search.search_links(str(query), max_results=max_sites)
    pages = scraper.scrape(urls)
    good = [p for p in pages if p.get("ok") and p.get("text")]

    if not good:
        return {"summary": "No pages could be scraped for this query.", "sources": urls}

    corpus = "\n\n".join(f"SOURCE: {p['url']}\n{p['text']}" for p in good)
    system = ("You are a research assistant. Summarize the sources faithfully and "
              "comprehensively, preserving key facts and figures. Cite source URLs inline.")
    prompt = f"Question/topic: {query}\n\nSources:\n{corpus}\n\nWrite a thorough summary."
    summary = hf_llm.complete(system, prompt, max_tokens=700)
    return {"summary": summary, "sources": [p["url"] for p in good]}
