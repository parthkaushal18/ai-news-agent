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
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>AI News</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;background:#09090b;color:#fafafa;min-height:100vh;overflow-x:hidden}
a{text-decoration:none;color:inherit}
button{cursor:pointer;border:none;outline:none;font-family:inherit}
input{outline:none;border:none;font-family:inherit}

/* ── Header ── */
header{position:sticky;top:0;z-index:100;display:flex;align-items:center;gap:.875rem;padding:.875rem 1.5rem;background:rgba(9,9,11,.96);border-bottom:1px solid #27272a;backdrop-filter:blur(20px)}
.logo{display:flex;align-items:center;gap:.625rem;flex-shrink:0}
.logo-icon{width:2rem;height:2rem;background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.3);border-radius:.5rem;display:flex;align-items:center;justify-content:center;font-size:.875rem}
.logo-name{font-size:.875rem;font-weight:700;color:#fafafa;white-space:nowrap}

.search-box{flex:1;max-width:380px;position:relative}
.search-box input{width:100%;padding:.5rem .875rem .5rem 2.25rem;background:#18181b;border:1px solid #27272a;border-radius:.625rem;font-size:.8rem;color:#fafafa;transition:border-color .15s}
.search-box input:focus{border-color:rgba(139,92,246,.5);background:#1c1c1f}
.search-box input::placeholder{color:#52525b}
.search-icon{position:absolute;left:.75rem;top:50%;transform:translateY(-50%);color:#52525b;pointer-events:none;font-size:.8rem}

.hdr-actions{margin-left:auto;display:flex;align-items:center;gap:.5rem}
.live-dot{width:.5rem;height:.5rem;background:#10b981;border-radius:50%;animation:blink 2s ease-in-out infinite;flex-shrink:0}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.btn{padding:.375rem .875rem;border-radius:.5rem;font-size:.75rem;font-weight:500;transition:all .15s}
.btn-ghost{background:#18181b;border:1px solid #27272a;color:#a1a1aa}
.btn-ghost:hover{background:#27272a;color:#fafafa}

/* ── Stat strip ── */
.strip{display:flex;align-items:center;gap:1.25rem;padding:.5rem 1.5rem;background:#0f0f11;border-bottom:1px solid #1c1c1f;font-size:.7rem;color:#52525b;overflow-x:auto;white-space:nowrap}
.strip b{color:#fafafa;font-variant-numeric:tabular-nums}
.strip-sep{width:1px;height:.875rem;background:#27272a;flex-shrink:0}

/* ── Layout ── */
.layout{display:flex;height:calc(100vh - 6.125rem)}

/* ── Sidebar ── */
.sidebar{width:196px;flex-shrink:0;border-right:1px solid #18181b;padding:1.25rem .875rem;overflow-y:auto;background:#0c0c0e}
.sidebar::-webkit-scrollbar{width:3px}
.sidebar::-webkit-scrollbar-thumb{background:#27272a;border-radius:9999px}
.sb-label{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#3f3f46;margin-bottom:.5rem;padding:0 .375rem}
.sb-section{margin-bottom:1.25rem}
.sb-item{display:flex;align-items:center;justify-content:space-between;padding:.375rem .5rem;border-radius:.5rem;font-size:.775rem;color:#71717a;cursor:pointer;transition:all .1s;user-select:none;gap:.5rem}
.sb-item:hover{background:#18181b;color:#e4e4e7}
.sb-item.active{background:rgba(139,92,246,.12);color:#c4b5fd}
.sb-item-left{display:flex;align-items:center;gap:.5rem;min-width:0}
.sb-dot{width:.4rem;height:.4rem;border-radius:50%;flex-shrink:0}
.sb-name{truncate:ellipsis;overflow:hidden;white-space:nowrap;font-size:.75rem}
.sb-count{font-size:.65rem;background:#18181b;color:#52525b;padding:.05rem .35rem;border-radius:9999px;flex-shrink:0;font-variant-numeric:tabular-nums}
.sb-item.active .sb-count{color:#8b5cf6;background:rgba(139,92,246,.15)}

/* ── Main ── */
.main{flex:1;overflow-y:auto;padding:1.25rem 1.5rem;min-width:0}
.main::-webkit-scrollbar{width:5px}
.main::-webkit-scrollbar-thumb{background:#27272a;border-radius:9999px}

.toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}
.result-info{font-size:.75rem;color:#52525b}
.result-info b{color:#a1a1aa}

/* ── Cards ── */
.cards{display:flex;flex-direction:column;gap:.5rem}

.card{display:block;background:#111113;border:1px solid #1c1c1f;border-radius:.875rem;padding:1rem 1.25rem;transition:all .15s;cursor:pointer}
.card:hover{background:#16161a;border-color:#2e2e33;transform:translateX(3px);box-shadow:-3px 0 0 #8b5cf6}

.card-top{display:flex;align-items:center;gap:.5rem;margin-bottom:.55rem;flex-wrap:wrap}
.src-pill{display:flex;align-items:center;gap:.375rem;font-size:.68rem;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.04em}
.src-dot{width:.45rem;height:.45rem;border-radius:50%;flex-shrink:0}
.cat-tag{font-size:.62rem;font-weight:600;padding:.1rem .45rem;border-radius:9999px}
.card-time{font-size:.65rem;color:#3f3f46;margin-left:auto;white-space:nowrap}

.card-title{font-size:.925rem;font-weight:600;color:#d4d4d8;line-height:1.45;margin-bottom:.35rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card:hover .card-title{color:#fafafa}
.card-summary{font-size:.775rem;color:#52525b;line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card:hover .card-summary{color:#71717a}

/* ── Empty / loading ── */
.center{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.875rem;padding:5rem 2rem;color:#3f3f46;text-align:center}
.spinner{width:1.75rem;height:1.75rem;border:2px solid #27272a;border-top-color:#8b5cf6;border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.center p{font-size:.875rem;color:#52525b}
.center small{font-size:.75rem}

@media(max-width:700px){
  .sidebar{display:none}
  .main{padding:1rem}
  .logo-name{display:none}
  header{padding:.75rem 1rem;gap:.625rem}
}
</style>
</head>
<body>

<header>
  <div class="logo">
    <div class="logo-icon">⚡</div>
    <span class="logo-name">AI News</span>
  </div>

  <div class="search-box">
    <span class="search-icon">⌕</span>
    <input id="q" type="search" placeholder="Search articles, topics, sources…" oninput="filter()"/>
  </div>

  <div class="hdr-actions">
    <div class="live-dot" title="Agent running"></div>
    <button class="btn btn-ghost" id="refresh-btn" onclick="doRefresh()">↻ Refresh</button>
  </div>
</header>

<div class="strip">
  <span><b id="s-total">—</b> articles</span>
  <div class="strip-sep"></div>
  <span><b id="s-src">—</b> sources</span>
  <div class="strip-sep"></div>
  <span>Updated <b id="s-updated">—</b></span>
  <div class="strip-sep"></div>
  <span>Next fetch <b id="s-next">—</b></span>
</div>

<div class="layout">
  <nav class="sidebar">
    <div class="sb-section">
      <div class="sb-label">Category</div>
      <div id="cat-list"></div>
    </div>
    <div class="sb-section">
      <div class="sb-label">Source</div>
      <div id="src-list"></div>
    </div>
  </nav>

  <div class="main">
    <div class="toolbar">
      <div class="result-info" id="result-info"></div>
    </div>
    <div class="cards" id="cards">
      <div class="center"><div class="spinner"></div><p>Loading articles…</p></div>
    </div>
  </div>
</div>

<script>
const SRC_COLORS = {
  'VentureBeat AI':   '#3b82f6',
  'TechCrunch AI':    '#22c55e',
  'The Decoder':      '#8b5cf6',
  'AI News':          '#f97316',
  'HuggingFace Blog': '#eab308',
  'Google DeepMind':  '#06b6d4',
  'MIT Tech Review':  '#ef4444',
  'Ars Technica':     '#f59e0b',
  'The Gradient':     '#ec4899',
  'Import AI':        '#14b8a6',
  'Hacker News':      '#fb923c',
  'arXiv':            '#a78bfa',
};
const CAT_COLORS = {
  'Industry':       '#3b82f6',
  'Research':       '#8b5cf6',
  'Research Paper': '#a78bfa',
  'Community':      '#f59e0b',
  'Newsletter':     '#10b981',
};

let all = [], activeCat = null, activeSrc = null;

function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

function ago(iso){
  if(!iso) return '';
  try{
    const d = new Date(iso), diff = (Date.now()-d)/1000;
    if(diff<60) return 'just now';
    if(diff<3600) return Math.floor(diff/60)+'m ago';
    if(diff<86400) return Math.floor(diff/3600)+'h ago';
    if(diff<604800) return Math.floor(diff/86400)+'d ago';
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  }catch{return ''}
}

function card(a){
  const sc = SRC_COLORS[a.source]||'#6b7280';
  const cc = CAT_COLORS[a.category]||'#6b7280';
  return `<a href="${esc(a.url)}" target="_blank" rel="noopener" class="card">
    <div class="card-top">
      <div class="src-pill"><span class="src-dot" style="background:${sc}"></span>${esc(a.source)}</div>
      <span class="cat-tag" style="color:${cc};background:${cc}18;border:1px solid ${cc}30">${esc(a.category)}</span>
      <span class="card-time">${ago(a.published)}</span>
    </div>
    <div class="card-title">${esc(a.title)}</div>
    ${a.summary?`<div class="card-summary">${esc(a.summary)}</div>`:''}
  </a>`;
}

function buildSidebar(){
  const cats={}, srcs={};
  for(const a of all){
    cats[a.category]=(cats[a.category]||0)+1;
    srcs[a.source]=(srcs[a.source]||0)+1;
  }
  const catEl=document.getElementById('cat-list');
  const srcEl=document.getElementById('src-list');
  catEl.innerHTML=`<div class="sb-item ${!activeCat?'active':''}" onclick="setCat(null)">
    <div class="sb-item-left"><span class="sb-name">All</span></div>
    <span class="sb-count">${all.length}</span></div>`+
    Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`
    <div class="sb-item ${activeCat===c?'active':''}" onclick="setCat('${c.replace(/'/g,"\\'")}')">
      <div class="sb-item-left">
        <span class="sb-dot" style="background:${CAT_COLORS[c]||'#6b7280'}"></span>
        <span class="sb-name">${esc(c)}</span>
      </div>
      <span class="sb-count">${n}</span>
    </div>`).join('');

  srcEl.innerHTML=`<div class="sb-item ${!activeSrc?'active':''}" onclick="setSrc(null)">
    <div class="sb-item-left"><span class="sb-name">All</span></div>
    <span class="sb-count">${all.length}</span></div>`+
    Object.entries(srcs).sort((a,b)=>b[1]-a[1]).map(([s,n])=>`
    <div class="sb-item ${activeSrc===s?'active':''}" onclick="setSrc('${s.replace(/'/g,"\\'")}')">
      <div class="sb-item-left">
        <span class="sb-dot" style="background:${SRC_COLORS[s]||'#6b7280'}"></span>
        <span class="sb-name">${esc(s)}</span>
      </div>
      <span class="sb-count">${n}</span>
    </div>`).join('');
}

function filter(){
  const q=(document.getElementById('q').value||'').toLowerCase().trim();
  let items=all;
  if(activeCat) items=items.filter(a=>a.category===activeCat);
  if(activeSrc) items=items.filter(a=>a.source===activeSrc);
  if(q) items=items.filter(a=>(a.title||'').toLowerCase().includes(q)||(a.summary||'').toLowerCase().includes(q)||(a.source||'').toLowerCase().includes(q));
  const info=document.getElementById('result-info');
  const label=activeCat||activeSrc||q?` matching <b style="color:#e4e4e7">${activeCat||activeSrc||q}</b>`:'';
  info.innerHTML=`<b>${items.length}</b> article${items.length!==1?'s':''}${label}`;
  const c=document.getElementById('cards');
  c.innerHTML=items.length?items.map(card).join(''):'<div class="center"><p>No articles match</p><small>Try a different filter</small></div>';
}

function setCat(c){activeCat=c;activeSrc=null;buildSidebar();filter()}
function setSrc(s){activeSrc=s;activeCat=null;buildSidebar();filter()}

async function load(){
  try{
    const r=await fetch('/news?limit=120');
    const d=await r.json();
    all=d.articles||[];
    const uSrc=new Set(all.map(a=>a.source)).size;
    document.getElementById('s-total').textContent=all.length;
    document.getElementById('s-src').textContent=uSrc;
    if(d.last_fetch) document.getElementById('s-updated').textContent=ago(d.last_fetch);
    buildSidebar();
    filter();
  }catch(e){
    document.getElementById('cards').innerHTML=`<div class="center"><p>Failed to load</p><small>${esc(e.message)}</small></div>`;
  }
}

async function doRefresh(){
  const btn=document.getElementById('refresh-btn');
  btn.textContent='⌛ ~30s…';btn.disabled=true;
  await fetch('/refresh',{method:'POST'});
  setTimeout(async()=>{await load();btn.textContent='↻ Refresh';btn.disabled=false},32000);
}

async function tick(){
  try{
    const h=await fetch('/health').then(r=>r.json());
    const s=h.next_fetch_in||0;
    document.getElementById('s-next').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  }catch{}
}

load();
setInterval(load,5*60*1000);
setInterval(tick,1000);
tick();
</script>
</body>
</html>"""


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    log.info(f"Starting AI News Agent on port {PORT}")
    load_cache()
    threading.Thread(target=background_loop, daemon=True).start()
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="warning")
