# SYNAPSE — AI News Mobile Terminal

## Original problem statement
> Build a mobile app: for the selcted github repoisitey make it very beautifula and very intuitive

Iteration 2: redesign + new logo + animations
Iteration 3 (Jun 25): "add in app article screen, autoprefreshes and rich push notifications for breaking news, remove filter by source and a good filter instead, make sure the trending thing works"

## Architecture
- **Backend (`/app/backend/server.py`)** — FastAPI. `/api/*` routes: health, news, sources, refresh, **trending** (recency + HN points heuristic). Background refresh every 30 min; on-disk JSON cache.
- **Frontend (`/app/frontend/`)** — React 18 + Tailwind + Framer Motion + Phosphor Icons. Editorial Klein-blue / paper aesthetic. Mobile-first shell. Bottom tab nav: Feed · Trending · Search · Saved.

## What's been implemented

### Iteration 1 — MVP
- Backend `/api/*` routes
- Mobile-first React UI
- Hero, chips, cards, search, filters, saved

### Iteration 2 — Visual Overhaul
- Custom SVG logo + animated synapse dots
- Splash boot screen
- Animated counters / marquee ticker
- Sliding chip pill + tab-indicator (layoutId)
- Parallax + shutter-reveal hero
- Ranked trending, reading-time, bookmark scale, AnimatePresence tabs, scroll-reset, skeleton loader
- Critical layout fix (`h-[100dvh]` + `overflow-hidden`)

### Iteration 3 — Reader, Live, Rich Filter, Trending
- **In-app ArticleReader** (full-screen sheet) — hero image, drop-cap summary, big "OPEN ON <domain>" CTA, save/share/back, "Back to feed" link. Opened via tap on any card / hero / search result. Replaces external `<a target=_blank>`.
- **Auto-refresh** — `setInterval(loadAll, 60_000)` plus `visibilitychange` listener (re-fetches when user returns to the tab).
- **Rich push notifications** — `useLiveNotifications` hook:
  - Tracks `Notification.permission` state
  - Bell button in header to request permission (Bell → BellRinging filled klein with red pulse when granted; BellSlash when denied)
  - First-fetch baselined so nothing fires on initial load
  - Fires native browser Notifications for up to 3 new articles per tick **when tab is in background**
  - Shows in-app `NewStoriesToast` ("X new stories · Tap to view") banner with dismiss
- **Rich Filters sheet** (replaces single-source picker):
  - 01 **Time window** — Anytime / Past hour / Past 24h / Past week
  - 02 **Sort by** — Newest / Trending / Most discussed
  - 03 **Categories** — multi-select chips
  - Reset + Apply with dirty indicator
  - Active-filter count badge on the funnel icon
  - Klein-blue active-filter banner with "CLEAR" link
- **Trending tab fix** — new `/api/trending` endpoint scores by recency decay (24h) + HN points boost; client renders ranked 01-20. Verified on fresh load AND after re-navigation.

## Test status
- **Iteration 1**: backend 8/8, all frontend flows passed
- **Iteration 2**: backend 8/8, all frontend flows passed
- **Iteration 3**: backend 11/11 (with 3 new `/api/trending` tests), 100% frontend coverage including reader/filter/trending/notifications

## Backlog
- **P1**: Inline reader content via Readability proxy (currently a preview only)
- **P1**: HTML-entity decoding in summaries (`&#038;` → `&`)
- **P2**: Onboarding tour explaining Bell, Save, Filter, Reader
- **P2**: Service-worker + VAPID web-push for true background notifications when the tab is closed
- **P2**: PWA manifest + install banner + offline cache of saved articles
- **P2**: Source-trending ranking per-category, infinite scroll
- **P3**: Share-card image generation ("Today's Digest")

## Files
- `/app/backend/server.py`, `.env`, `requirements.txt`, `tests/test_news_api.py`
- `/app/frontend/src/App.js`
- `/app/frontend/src/hooks/useLiveNotifications.js`
- `/app/frontend/src/components/`:
  - `Logo.js`, `Splash.js`, `Counter.js`
  - `HeroStory.js`, `ArticleCard.js`
  - `SearchSheet.js`, `FiltersSheet.js`
  - **`ArticleReader.js`** (NEW), **`NewStoriesToast.js`** (NEW)
- `/app/frontend/src/constants.js`, `index.css`, `tailwind.config.js`
- `/app/memory/test_credentials.md`, `/app/memory/PRD.md`
