# SYNAPSE — AI News Mobile Terminal

## Original problem statement
> Build a mobile app: for the selcted github repoisitey make it very beautifula and very intuitive

The "selected GitHub repository" was the project shipped in `/app` — an FastAPI **AI News Agent** that aggregates AI stories from 12+ sources (RSS, Hacker News, arXiv) and previously served a desktop-style dark HTML page. We rebuilt the frontend as **SYNAPSE**, a beautiful mobile-first React app.

## Architecture

- **Backend (`/app/backend/server.py`)** — FastAPI, all routes prefixed with `/api`.
  - Adapts the original `agent.py` logic: RSS fetchers (10 feeds), Hacker News (Algolia), arXiv Atom feed.
  - Background thread refreshes every 30 min; caches to `/app/backend/data/news.json`.
  - Endpoints: `/api/health`, `/api/news` (with `category`, `source`, `q`, `limit`), `/api/sources`, `POST /api/refresh`.

- **Frontend (`/app/frontend/`)** — React 18 + Tailwind + Framer Motion + Phosphor Icons.
  - Editorial "Swiss / Control Room" aesthetic — cream (`#F4F4F0`) paper, ink (`#0A0A0A`) text, Klein Blue (`#0000FF`) accent, Signal Red (`#FF3B30`) live dot.
  - Typography: Cabinet Grotesk (display) + IBM Plex Sans (body) + IBM Plex Mono (meta).
  - Mobile-first shell (max-w-md) — works as a polished mobile web app on phones and as a "device frame" centered on desktop.
  - Bottom tab nav: **Feed · Trending · Search · Saved**.
  - Saved articles persist via `localStorage`.

## Implemented (Jan 2026)

- [x] Backend API at `/api/*` with health/news/sources/refresh routes
- [x] Beautiful mobile-first UI with editorial typography & motion
- [x] Hero "TOP STORY" card with grayscale image treatment
- [x] Horizontally scrollable category chip rail with active state
- [x] Article cards: source dot, category color, mono meta, tap-to-open external link, bookmark toggle
- [x] Search sheet (slides up from bottom) with full-screen text input
- [x] Filters sheet for choosing source (12 sources + counts + dot color)
- [x] Trending tab — Hacker News / Community pulse
- [x] Saved tab with per-device localStorage persistence and empty state
- [x] Stats strip — total stories, sources, live countdown to next fetch, LIVE pulse
- [x] Fix: Hacker News Algolia `numericFilters=points>15` 400 → now filters client-side
- [x] All interactive elements have `data-testid` attributes
- [x] Tested end-to-end (backend 8/8, frontend all flows verified)

## User personas
- **Engineers / Researchers** — want a fast, distraction-free, dense feed of credible AI news on their phone, with HN community pulse and arXiv drops.
- **Founders / PMs** — scan the daily TOP STORY, save things to read later in transit.

## Backlog / Next ideas
- **P1**: Article detail screen (in-app reader rather than external open)
- **P1**: HTML-entity decode on the backend (`H&#038;M` → `H&M`) for cleaner summaries
- **P2**: Onboarding tour highlighting save, search, filters
- **P2**: Per-source mute / favourite & smart "For You" tab
- **P2**: PWA manifest + install banner + offline cache of saved articles
- **P3**: Push notifications for breaking AI news (web push)
- **P3**: Share sheet integration

## Files
- `/app/backend/server.py` — FastAPI app, fetchers, /api routes
- `/app/backend/.env` — `MONGO_URL`, `DB_NAME` (placeholders; Mongo unused)
- `/app/backend/requirements.txt`
- `/app/frontend/src/App.js` — top-level container, screens, bottom nav
- `/app/frontend/src/components/HeroStory.js`
- `/app/frontend/src/components/ArticleCard.js`
- `/app/frontend/src/components/SearchSheet.js`
- `/app/frontend/src/components/FiltersSheet.js`
- `/app/frontend/src/constants.js`
- `/app/frontend/src/index.css`
- `/app/frontend/tailwind.config.js`
- `/app/design_guidelines.json`
- `/app/memory/test_credentials.md`
