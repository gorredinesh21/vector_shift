"""One error family so failures surface uniformly (engine turns these into node errors)."""


class PipelineError(Exception):
    """Base for all pipeline errors."""


class NodeError(PipelineError):
    """Raised inside a node executor when it cannot produce output."""


class LLMError(PipelineError):
    """Hugging Face LLM call failed."""


class EmbeddingError(PipelineError):
    """Hugging Face embedding call failed."""


class SearchError(PipelineError):
    """Web search failed."""
