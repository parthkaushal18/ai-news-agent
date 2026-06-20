"""
AI News Agent — serverless edition for Vercel.
Stores news in Redis. No background threads; /refresh fetches synchronously.
"""

import json
import os
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Optional

import feedparser
import requests
from fastapi import FastAPI, Query
from fastapi.responses import HTMLResponse

REDIS_URL = os.environ.get("REDIS_URL", "")
CACHE_KEY = "ai-news:articles"
META_KEY  = "ai-news:meta"
REFRESH_INTERVAL = 1800  # 30 min
MAX_ARTICLES = 120

RSS_FEEDS = [
    {"name": "VentureBeat AI",   "url": "https://venturebeat.com/category/ai/feed/",                     "category": "Industry"},
    {"name": "TechCrunch AI",    "url": "https://techcrunch.com/category/artificial-intelligence/feed/",  "category": "Industry"},
    {"name": "The Decoder",      "url": "https://the-decoder.com/feed/",                                  "category": "Industry"},
    {"name": "AI News",          "url": "https://www.artificialintelligence-news.com/feed/",               "category": "Industry"},
    {"name": "HuggingFace Blog", "url": "https://huggingface.co/blog/feed.xml",                           "category": "Research"},
    {"name": "Google DeepMind",  "url": "https://deepmind.google/blog/rss/",                              "category": "Research"},
    {"name": "MIT Tech Review",  "url": "https://www.technologyreview.com/feed/",                         "category": "Research"},
    {"name": "Ars Technica",     "url": "https://feeds.arstechnica.com/arstechnica/technology-lab",       "category": "Industry"},
    {"name": "The Gradient",     "url": "https://thegradient.pub/rss/",                                   "category": "Research"},
    {"name": "Import AI",        "url": "https://jack-clark.net/feed/",                                   "category": "Newsletter"},
]

AI_KEYWORDS = {
    "ai", "artificial intelligence", "machine learning", "deep learning",
    "large language model", "llm", "gpt", "claude", "gemini", "llama",
    "mistral", "neural network", "transformer", "diffusion", "generative ai",
    "openai", "anthropic", "google ai", "meta ai", "model", "benchmark",
    "chatgpt", "multimodal", "embedding", "reinforcement learning",
    "agent", "autonomous", "copilot", "chatbot", "language model",
    "foundation model", "fine-tuning", "rag", "vector", "inference",
    "gpu", "nvidia", "stable diffusion", "midjourney", "sora", "grok",
}

# ── Storage (Redis or in-memory) ──────────────────────────────────────────────

_mem_articles: list = []
_mem_last_fetch: Optional[datetime] = None
_redis_client = None


def _get_redis():
    global _redis_client
    if _redis_client:
        return _redis_client
    if REDIS_URL and not REDIS_URL.startswith("https://"):
        import redis as redis_pkg
        _redis_client = redis_pkg.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=5, socket_timeout=5)
        return _redis_client
    return None


def load_cache() -> tuple[list, Optional[datetime]]:
    r = _get_redis()
    if r:
        try:
            raw = r.get(CACHE_KEY)
            meta = r.get(META_KEY)
            articles = json.loads(raw) if raw else []
            last_fetch = datetime.fromisoformat(meta) if meta else None
            return articles, last_fetch
        except Exception as e:
            print(f"Redis load error: {e}")
    return _mem_articles, _mem_last_fetch


def save_cache(articles: list, last_fetch: datetime) -> None:
    global _mem_articles, _mem_last_fetch
    _mem_articles = articles
    _mem_last_fetch = last_fetch
    r = _get_redis()
    if r:
        try:
            r.set(CACHE_KEY, json.dumps(articles), ex=86400)
            r.set(META_KEY, last_fetch.isoformat(), ex=86400)
        except Exception as e:
            print(f"Redis save error: {e}")


# ── Helpers ───────────────────────────────────────────────────────────────────

def is_ai_related(text: str) -> bool:
    t = text.lower()
    return any(kw in t for kw in AI_KEYWORDS)


def strip_html(raw: str, max_len: int = 300) -> str:
    clean = re.sub(r"<[^>]+>", " ", raw or "")
    clean = re.sub(r"\s+", " ", clean).strip()
    return (clean[:max_len] + "…") if len(clean) > max_len else clean


def to_iso(struct_time) -> str:
    try:
        return datetime(*struct_time[:6], tzinfo=timezone.utc).isoformat()
    except Exception:
        return datetime.now(timezone.utc).isoformat()


# ── Fetchers ──────────────────────────────────────────────────────────────────

def fetch_rss() -> list:
    articles = []
    for feed_cfg in RSS_FEEDS:
        try:
            feed = feedparser.parse(feed_cfg["url"])
            for entry in feed.entries[:12]:
                title   = entry.get("title", "").strip()
                summary = strip_html(entry.get("summary", entry.get("description", "")))
                link    = entry.get("link", "")
                if not is_ai_related(title + " " + summary):
                    continue
                published = (
                    to_iso(entry.published_parsed)
                    if getattr(entry, "published_parsed", None)
                    else datetime.now(timezone.utc).isoformat()
                )
                articles.append({
                    "id": link or title, "title": title, "summary": summary,
                    "url": link, "source": feed_cfg["name"],
                    "category": feed_cfg["category"], "published": published,
                })
        except Exception as e:
            print(f"RSS {feed_cfg['name']} error: {e}")
    return articles


def fetch_hackernews() -> list:
    articles = []
    try:
        resp = requests.get(
            "https://hn.algolia.com/api/v1/search"
            "?query=AI+machine+learning+LLM+GPT+model"
            "&tags=story&hitsPerPage=40&numericFilters=points>15",
            timeout=12,
        )
        resp.raise_for_status()
        for hit in resp.json().get("hits", []):
            title = hit.get("title", "")
            if not is_ai_related(title):
                continue
            hn_id = hit.get("objectID", "")
            url   = hit.get("url") or f"https://news.ycombinator.com/item?id={hn_id}"
            articles.append({
                "id": f"hn-{hn_id}", "title": title,
                "summary": f"{hit.get('points',0)} points · {hit.get('num_comments',0)} comments on Hacker News",
                "url": url, "source": "Hacker News", "category": "Community",
                "published": hit.get("created_at", datetime.now(timezone.utc).isoformat()),
            })
    except Exception as e:
        print(f"HackerNews error: {e}")
    return articles


def fetch_arxiv() -> list:
    articles = []
    try:
        resp = requests.get(
            "http://export.arxiv.org/api/query"
            "?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL"
            "&sortBy=submittedDate&sortOrder=descending&max_results=20",
            timeout=15,
        )
        resp.raise_for_status()
        ns   = {"atom": "http://www.w3.org/2005/Atom"}
        root = ET.fromstring(resp.text)
        for entry in root.findall("atom:entry", ns):
            title   = (entry.findtext("atom:title", "", ns) or "").replace("\n", " ").strip()
            summary = strip_html((entry.findtext("atom:summary", "", ns) or "").replace("\n", " ").strip(), 280)
            published = entry.findtext("atom:published", "", ns)
            link = next(
                (el.get("href", "") for el in entry.findall("atom:link", ns) if el.get("type") == "text/html"),
                "",
            )
            authors = [a.findtext("atom:name", "", ns) for a in entry.findall("atom:author", ns)][:3]
            author_str = ", ".join(authors) + ("…" if len(authors) == 3 else "")
            articles.append({
                "id": link or title, "title": title,
                "summary": f"{summary}  ·  Authors: {author_str}",
                "url": link, "source": "arXiv", "category": "Research Paper",
                "published": published or datetime.now(timezone.utc).isoformat(),
            })
    except Exception as e:
        print(f"arXiv error: {e}")
    return articles


def fetch_all() -> tuple[list, datetime]:
    raw = fetch_rss() + fetch_hackernews() + fetch_arxiv()
    seen: set = set()
    unique: list = []
    for a in raw:
        key = (a.get("id") or a.get("url") or "").strip()
        if key and key not in seen:
            seen.add(key)
            a["fetched_at"] = datetime.now(timezone.utc).isoformat()
            unique.append(a)
    unique.sort(key=lambda x: x.get("published", ""), reverse=True)
    articles   = unique[:MAX_ARTICLES]
    last_fetch = datetime.now(timezone.utc)
    save_cache(articles, last_fetch)
    return articles, last_fetch


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(title="AI News Agent", version="1.0.0", docs_url="/docs")
_start = time.time()


@app.get("/health")
def health():
    articles, last_fetch = load_cache()
    secs_since = (time.time() - last_fetch.timestamp()) if last_fetch else REFRESH_INTERVAL
    return {
        "status": "alive",
        "agent": "AI News Agent",
        "articles": len(articles),
        "sources": len(RSS_FEEDS) + 2,
        "last_fetch": last_fetch.isoformat() if last_fetch else None,
        "uptime_seconds": int(time.time() - _start),
        "next_fetch_in": max(0, REFRESH_INTERVAL - int(secs_since)),
    }


@app.get("/news")
def get_news(
    category: Optional[str] = Query(None),
    source:   Optional[str] = Query(None),
    q:        Optional[str] = Query(None),
    limit:    int           = Query(50, le=120),
):
    articles, last_fetch = load_cache()
    items = articles
    if category:
        items = [a for a in items if a.get("category", "").lower() == category.lower()]
    if source:
        items = [a for a in items if a.get("source", "").lower() == source.lower()]
    if q:
        ql = q.lower()
        items = [a for a in items if ql in a.get("title","").lower() or ql in a.get("summary","").lower()]
    return {"total": len(items), "articles": items[:limit], "last_fetch": last_fetch.isoformat() if last_fetch else None}


@app.post("/refresh")
def trigger_refresh():
    articles, last_fetch = fetch_all()
    return {"message": "Done", "articles": len(articles), "last_fetch": last_fetch.isoformat()}


@app.get("/", response_class=HTMLResponse)
def index():
    try:
        # Check paths relative to this file to locate index.html
        paths = [
            os.path.join(os.path.dirname(__file__), "index.html"),
            os.path.join(os.path.dirname(__file__), "api", "index.html"),
            os.path.join(os.path.dirname(__file__), "..", "api", "index.html"),
        ]
        for path in paths:
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    return f.read()
    except Exception as e:
        print(f"Error loading index.html: {e}")
    
    return HTMLResponse(
        content="<h1>Error loading frontend template</h1><p>Ensure api/index.html exists.</p>", 
        status_code=500
    )
