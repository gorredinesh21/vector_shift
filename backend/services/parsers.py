"""Parse documents to plain text, dispatching by file extension."""
import logging
import os

log = logging.getLogger(__name__)


def _pdf(path: str) -> str:
    from pypdf import PdfReader
    reader = PdfReader(path)
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def _docx(path: str) -> str:
    import docx
    doc = docx.Document(path)
    return "\n".join(p.text for p in doc.paragraphs)


def _csv(path: str) -> str:
    import pandas as pd
    return pd.read_csv(path).to_csv(index=False)


def _xlsx(path: str) -> str:
    import pandas as pd
    return pd.read_excel(path).to_csv(index=False)


def _text(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


_DISPATCH = {
    ".pdf": _pdf, ".docx": _docx, ".csv": _csv,
    ".xlsx": _xlsx, ".xls": _xlsx,
    ".txt": _text, ".md": _text, ".json": _text,
}


def parse(path: str) -> str:
    """Return the text content of a document at `path`."""
    if not path or not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {path}")
    ext = os.path.splitext(path)[1].lower()
    fn = _DISPATCH.get(ext)
    if fn is None:
        raise ValueError(f"Unsupported file type: {ext}")
    return fn(path)


if __name__ == "__main__":  # smoke test (personal laptop)
    import sys
    print(parse(sys.argv[1])[:500])
