# AI News Agent

An autonomous AI news aggregator that continuously fetches, filters, and surfaces the latest AI articles from 12 curated sources — deployed as a serverless app on Vercel.

**Live App:** [ai-news-agent.vercel.app](https://ai-news-agent.vercel.app)

---

## Features

### News Aggregation
- **12 sources** polled every 30 minutes automatically
- **RSS feeds** — VentureBeat AI, TechCrunch AI, The Decoder, AI News, HuggingFace Blog, Google DeepMind, MIT Tech Review, Ars Technica, The Gradient, Import AI
- **Hacker News** — top AI stories via Algolia API (15+ points threshold)
- **arXiv** — latest research papers from cs.AI, cs.LG, cs.CL categories
- Up to **120 unique articles** stored and served at a time

### Smart Filtering
- Keyword-based AI relevance filter — only articles mentioning LLMs, models, agents, benchmarks, etc. make it through
- Automatic deduplication by URL/ID across all sources
- Articles sorted by publish date (newest first)

### Web UI
- Dark, minimal interface with sticky header and live status indicator
- **Sidebar filters** by category (Industry, Research, Research Paper, Community, Newsletter) and by source
- **Full-text search** across titles, summaries, and sources
- Color-coded source and category tags per article
- Relative timestamps ("2h ago", "3d ago")
- Manual refresh button
- Countdown to next auto-fetch
- Mobile responsive

### REST API
| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Web UI |
| `/news` | GET | JSON feed — supports `?category=`, `?source=`, `?q=`, `?limit=` |
| `/refresh` | POST | Trigger an immediate news fetch |
| `/health` | GET | Agent status, article count, uptime, next fetch countdown |
| `/docs` | GET | Interactive Swagger UI |

### Infrastructure
- **Vercel** serverless deployment (Python / FastAPI via ASGI)
- **Redis** cache for article persistence across serverless invocations (falls back to in-memory)
- Local version uses a JSON file cache and a background polling thread

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, Uvicorn |
| News fetching | feedparser, requests |
| Research papers | arXiv Atom API |
| Community news | HackerNews Algolia API |
| Cache (prod) | Redis |
| Cache (local) | JSON file |
| Deployment | Vercel (serverless) |
| Frontend | Vanilla JS + CSS (served inline) |

---

## Running Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Start the server
python agent.py
```

Open [http://localhost:8001](http://localhost:8001)

The agent fetches news on startup and then re-fetches every 30 minutes in a background thread.

---

## API Usage

```bash
# Get latest 50 articles
curl http://localhost:8001/news

# Filter by category
curl "http://localhost:8001/news?category=Research+Paper"

# Search
curl "http://localhost:8001/news?q=llama"

# Trigger manual refresh
curl -X POST http://localhost:8001/refresh

# Health check
curl http://localhost:8001/health
```

---

## Deploying to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set Redis env var for persistent caching
vercel env add REDIS_URL
```

The `api/index.py` file is the serverless entry point used by Vercel. Set `REDIS_URL` to a Redis connection string (e.g. from Upstash) to persist articles across cold starts.

---

## Sources

| Source | Category |
|---|---|
| VentureBeat AI | Industry |
| TechCrunch AI | Industry |
| The Decoder | Industry |
| AI News | Industry |
| Ars Technica | Industry |
| HuggingFace Blog | Research |
| Google DeepMind | Research |
| MIT Tech Review | Research |
| The Gradient | Research |
| arXiv (cs.AI / cs.LG / cs.CL) | Research Paper |
| Hacker News | Community |
| Import AI | Newsletter |
