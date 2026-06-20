"""
AI News Agent — fetches latest AI news from RSS feeds, HackerNews, and arXiv.
Exposes a FastAPI server on port 8001.
"""

import json
import re
import threading
import time
import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import feedparser
import requests
import uvicorn
from fastapi import FastAPI, Query
from fastapi.responses import HTMLResponse, JSONResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("ai-news-agent")

# ── Config ──────────────────────────────────────────────────────────────────

PORT = 8001
FETCH_INTERVAL_SECONDS = 30 * 60  # 30 minutes
MAX_ARTICLES = 120
DATA_FILE = Path(__file__).parent / "data" / "news.json"
DATA_FILE.parent.mkdir(parents=True, exist_ok=True)

RSS_FEEDS = [
    {"name": "VentureBeat AI",   "url": "https://venturebeat.com/category/ai/feed/",                  "category": "Industry"},
    {"name": "TechCrunch AI",    "url": "https://techcrunch.com/category/artificial-intelligence/feed/", "category": "Industry"},
    {"name": "The Decoder",      "url": "https://the-decoder.com/feed/",                              "category": "Industry"},
    {"name": "AI News",          "url": "https://www.artificialintelligence-news.com/feed/",           "category": "Industry"},
    {"name": "HuggingFace Blog", "url": "https://huggingface.co/blog/feed.xml",                       "category": "Research"},
    {"name": "Google DeepMind",  "url": "https://deepmind.google/blog/rss/",                          "category": "Research"},
    {"name": "MIT Tech Review",  "url": "https://www.technologyreview.com/feed/",                     "category": "Research"},
    {"name": "Ars Technica",     "url": "https://feeds.arstechnica.com/arstechnica/technology-lab",   "category": "Industry"},
    {"name": "The Gradient",     "url": "https://thegradient.pub/rss/",                               "category": "Research"},
    {"name": "Import AI",        "url": "https://jack-clark.net/feed/",                               "category": "Newsletter"},
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

# ── State ────────────────────────────────────────────────────────────────────

news_store: list[dict] = []
last_fetch: Optional[datetime] = None
fetch_count: int = 0
start_time: float = time.time()

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

def fetch_rss() -> list[dict]:
    articles = []
    for feed_cfg in RSS_FEEDS:
        try:
            feed = feedparser.parse(feed_cfg["url"])
            for entry in feed.entries[:12]:
                title = entry.get("title", "").strip()
                summary = strip_html(entry.get("summary", entry.get("description", "")))
                link = entry.get("link", "")
                if not is_ai_related(title + " " + summary):
                    continue
                published = (
                    to_iso(entry.published_parsed)
                    if getattr(entry, "published_parsed", None)
                    else datetime.now(timezone.utc).isoformat()
                )
                articles.append({
                    "id": link or title,
                    "title": title,
                    "summary": summary,
                    "url": link,
                    "source": feed_cfg["name"],
                    "category": feed_cfg["category"],
                    "published": published,
                })
            log.info(f"  ✓ {feed_cfg['name']} — {len([a for a in articles if a['source']==feed_cfg['name']])} AI articles")
        except Exception as e:
            log.warning(f"  ✗ {feed_cfg['name']}: {e}")
    return articles


def fetch_hackernews() -> list[dict]:
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
            url = hit.get("url") or f"https://news.ycombinator.com/item?id={hn_id}"
            points = hit.get("points", 0)
            comments = hit.get("num_comments", 0)
            articles.append({
                "id": f"hn-{hn_id}",
                "title": title,
                "summary": f"{points} points · {comments} comments on Hacker News",
                "url": url,
                "source": "Hacker News",
                "category": "Community",
                "published": hit.get("created_at", datetime.now(timezone.utc).isoformat()),
            })
        log.info(f"  ✓ Hacker News — {len(articles)} AI stories")
    except Exception as e:
        log.warning(f"  ✗ Hacker News: {e}")
    return articles


def fetch_arxiv() -> list[dict]:
    articles = []
    try:
        resp = requests.get(
            "http://export.arxiv.org/api/query"
            "?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL"
            "&sortBy=submittedDate&sortOrder=descending&max_results=20",
            timeout=15,
        )
        resp.raise_for_status()
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        root = ET.fromstring(resp.text)
        for entry in root.findall("atom:entry", ns):
            title = (entry.findtext("atom:title", "", ns) or "").replace("\n", " ").strip()
            summary = strip_html((entry.findtext("atom:summary", "", ns) or "").replace("\n", " ").strip(), 280)
            published = entry.findtext("atom:published", "", ns)
            link = ""
            for lel in entry.findall("atom:link", ns):
                if lel.get("type") == "text/html":
                    link = lel.get("href", "")
                    break
            authors = [
                a.findtext("atom:name", "", ns)
                for a in entry.findall("atom:author", ns)
            ][:3]
            author_str = ", ".join(authors) + ("…" if len(authors) == 3 else "")
            articles.append({
                "id": link or title,
                "title": title,
                "summary": f"{summary}  ·  Authors: {author_str}",
                "url": link,
                "source": "arXiv",
                "category": "Research Paper",
                "published": published or datetime.now(timezone.utc).isoformat(),
            })
        log.info(f"  ✓ arXiv — {len(articles)} papers")
    except Exception as e:
        log.warning(f"  ✗ arXiv: {e}")
    return articles


# ── Core fetch logic ──────────────────────────────────────────────────────────

def fetch_all():
    global news_store, last_fetch, fetch_count
    log.info("━━━ Fetching AI news ━━━")

    raw = fetch_rss() + fetch_hackernews() + fetch_arxiv()

    # Deduplicate by URL/id
    seen: set[str] = set()
    unique: list[dict] = []
    for a in raw:
        key = (a.get("id") or a.get("url") or "").strip()
        if key and key not in seen:
            seen.add(key)
            a["fetched_at"] = datetime.now(timezone.utc).isoformat()
            unique.append(a)

    unique.sort(key=lambda x: x.get("published", ""), reverse=True)
    news_store = unique[:MAX_ARTICLES]
    last_fetch = datetime.now(timezone.utc)
    fetch_count += 1

    DATA_FILE.write_text(
        json.dumps({"articles": news_store, "last_fetch": last_fetch.isoformat()}, indent=2)
    )
    log.info(f"━━━ Done — {len(news_store)} unique articles ━━━")


def load_cache():
    global news_store, last_fetch
    if DATA_FILE.exists():
        try:
            data = json.loads(DATA_FILE.read_text())
            news_store = data.get("articles", [])
            lf = data.get("last_fetch")
            last_fetch = datetime.fromisoformat(lf) if lf else None
            log.info(f"Loaded {len(news_store)} cached articles")
        except Exception as e:
            log.warning(f"Cache load failed: {e}")


def background_loop():
    while True:
        try:
            fetch_all()
        except Exception as e:
            log.error(f"Fetch loop error: {e}")
        time.sleep(FETCH_INTERVAL_SECONDS)


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(title="AI News Agent", version="1.0.0", docs_url="/docs")


@app.get("/health")
def health():
    return {
        "status": "alive",
        "agent": "AI News Agent",
        "articles": len(news_store),
        "sources": len(RSS_FEEDS) + 2,
        "last_fetch": last_fetch.isoformat() if last_fetch else None,
        "fetch_count": fetch_count,
        "uptime_seconds": int(time.time() - start_time),
        "next_fetch_in": max(0, FETCH_INTERVAL_SECONDS - int((time.time() - (last_fetch.timestamp() if last_fetch else start_time)))),
    }


@app.get("/news")
def get_news(
    category: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="Search query"),
    limit: int = Query(50, le=120),
):
    items = news_store
    if category:
        items = [a for a in items if a.get("category", "").lower() == category.lower()]
    if source:
        items = [a for a in items if a.get("source", "").lower() == source.lower()]
    if q:
        ql = q.lower()
        items = [a for a in items if ql in a.get("title", "").lower() or ql in a.get("summary", "").lower()]
    return {
        "total": len(items),
        "articles": items[:limit],
        "last_fetch": last_fetch.isoformat() if last_fetch else None,
    }


@app.post("/refresh")
def trigger_refresh():
    threading.Thread(target=fetch_all, daemon=True).start()
    return {"message": "Refresh triggered — check back in ~30s"}


@app.get("/", response_class=HTMLResponse)
def index():
    import os
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
        log.warning(f"Error loading index.html: {e}")
    
    return HTMLResponse(
        content="<h1>Error loading frontend template</h1><p>Ensure api/index.html exists.</p>", 
        status_code=500
    )


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    log.info(f"Starting AI News Agent on port {PORT}")
    load_cache()
    threading.Thread(target=background_loop, daemon=True).start()
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="warning")
