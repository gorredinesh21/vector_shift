"""Central settings — every module reads config from here (no scattered os.getenv)."""
import os
from pathlib import Path

from dotenv import load_dotenv

_BASE = Path(__file__).resolve().parent
load_dotenv(_BASE / ".env")

HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_LLM_MODEL = os.getenv("HF_LLM_MODEL", "meta-llama/Llama-3.2-3B-Instruct")
HF_EMBED_MODEL = os.getenv("HF_EMBED_MODEL", "BAAI/bge-small-en-v1.5")

CHROMA_DIR = str((_BASE / os.getenv("CHROMA_DIR", "chroma_store")).resolve())
SQLITE_PATH = str((_BASE / os.getenv("SQLITE_PATH", "vectorshift.db")).resolve())
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

# RAG defaults (locked)
CHUNK_SIZE = 700
CHUNK_OVERLAP = 100
TOP_K = 7

# Web scraper caps
MAX_SCRAPE_SITES = 10
HTTP_TIMEOUT = 15
