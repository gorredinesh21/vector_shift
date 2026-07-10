"""Document Loader + RAG (Context Builder / Context Search)."""
import db
from engine.registry import register
from services import parsers, vectorstore


@register("fileLoader")
def document_loader_node(inputs: dict, config: dict) -> dict:
    """Parse a local document (by path) into plain text."""
    path = config.get("path", "")
    text = parsers.parse(path)
    return {"document": text}


@register("contextBuilder")
def context_builder_node(inputs: dict, config: dict) -> dict:
    """Chunk + embed the incoming document into its own Chroma collection (a 'context')."""
    text = inputs.get("documents") or ""
    name = config.get("contextName") or "context"
    collection, count = vectorstore.build(name, str(text))
    db.register_context(name, collection, vectorstore.config.CHUNK_SIZE, count)
    # downstream Context Search needs the collection id
    return {"context": collection}


@register("contextSearch")
def context_search_node(inputs: dict, config: dict) -> dict:
    """Retrieve the top-k most relevant chunks from a context for a query."""
    collection = inputs.get("context")
    query = inputs.get("query") or ""
    if not collection or not query:
        return {"results": []}
    try:
        k = int(config.get("topK", vectorstore.config.TOP_K))
    except (TypeError, ValueError):
        k = vectorstore.config.TOP_K
    chunks = vectorstore.search(str(collection), str(query), k=k)
    return {"results": chunks}
