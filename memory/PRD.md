# SYNAPSE — AI News Mobile Terminal

## Original problem statement
> Build a mobile app: for the selcted github repoisitey make it very beautifula and very intuitive

Iteration 2 (Jun 21):
> lets give the app a full overlook with animations and everyhting yoi can chck that i have changed some files in the app too from github and update them them accordingly — give it a new app logo as well as make it very beautiful and intuitive

## Architecture
- **Backend (`/app/backend/server.py`)** — FastAPI, all routes prefixed with `/api`. Adapts logic from the original `agent.py`. RSS (10 feeds) + Hacker News (Algolia) + arXiv. Background refresh every 30 min; JSON file cache.
- **Frontend (`/app/frontend/`)** — React 18 + Tailwind + Framer Motion + Phosphor Icons. Editorial "Swiss / Control Room" aesthetic: cream paper, ink text, Klein Blue accent, Signal Red live dot. Mobile-first shell (max-w-md). Bottom tab nav: **Feed · Trending · Search · Saved**.

## What's been implemented

### Iteration 1 (Jun 20)
- [x] Backend `/api/*` endpoints (`/health`, `/news`, `/sources`, `/refresh`)
- [x] Mobile-first React UI with Cabinet Grotesk + IBM Plex
- [x] Hero TOP STORY, category chips, article cards
- [x] Search sheet, Filters sheet, Saved (localStorage)
- [x] Hacker News fix (Algolia removed `numericFilters=points>15`)

### Iteration 2 (Jun 21) — Full Visual Overhaul
- [x] **New custom logo** — `Logo.js` — SVG 3-bar S-mark with animated klein-blue synapse dots + signal-red corner accent. Used in header, splash, footer, favicon
- [x] **Animated splash screen** — `Splash.js` — "SYN·APSE / OS" boot sequence: logo reveal, wordmark, progress bar, terminal boot lines (POWER ON, AGENT INIT, FEED SYNC, 12 SOURCES :: ONLINE). Slides up after 2s.
- [x] **Animated counters** — `Counter.js` — eased number transitions for stats strip & saved count
- [x] **Source marquee ticker** — continuous horizontal scroll showing all source names + counts in brackets
- [x] **Sliding chip pill** — framer-motion `layoutId="chip-bg"` animates the black active background between category chips
- [x] **Animated bottom-tab indicator** — `layoutId="tab-indicator"` underline slides between tabs in klein blue
- [x] **Parallax hero** — image scrolls with subtle offset via `useScroll/useTransform`; shutter-reveal mask on mount; scanline overlay; pulsing LIVE badge; ISS · 001 issue marker
- [x] **Ranked Trending** — articles 01–20 with prefix rank numbers via `rank` prop
- [x] **Reading time** — `1 MIN` estimate displayed on each article card
- [x] **Bookmark scale animation** — whileTap scale-down and post-toggle bounce
- [x] **Tab transition** — AnimatePresence cross-fade between Feed / Trending / Saved screens
- [x] **Scroll-reset on tab change** — `mainRef.scrollTo({top:0})` so each screen starts at top
- [x] **Big hollow section numbers** — "02" gigantic gray numbers on section headers
- [x] **Skeleton loader** — 3 skeleton card placeholders during fetch
- [x] **Critical bug fix** — App shell was using `min-h-[100dvh]` causing it to grow to ~18,000px on mobile (splash extended way off-screen). Fixed to `h-[100dvh]` with `overflow-hidden` on outer.

## Test status (iteration_2)
- Backend: **8/8 pytest pass**
- Frontend: **All flows pass** — splash detach, header logo, stats-strip counters, marquee, chips layoutId, hero shutter, reading time, bookmark scale, trending rank, tab-indicator underline, scroll-reset, search, filters, viewport-bound app-shell

## Backlog / Next ideas
- **P1**: In-app article reader (avoid kicking users to external)
- **P1**: HTML entity decoding in summaries (`&#038;` → `&`)
- **P2**: Onboarding tour for Save/Search/Filters
- **P2**: PWA manifest + install banner + offline cache of saved
- **P2**: Smart "For You" tab via simple keyword affinity from saved
- **P3**: Web push notifications for breaking AI news
- **P3**: Share sheet integration

## Files
- `/app/backend/server.py`, `.env`, `requirements.txt`
- `/app/frontend/src/App.js` — top-level container, screens, bottom nav
- `/app/frontend/src/components/Logo.js` — animated SVG logo
- `/app/frontend/src/components/Splash.js` — boot screen
- `/app/frontend/src/components/Counter.js` — animated number
- `/app/frontend/src/components/HeroStory.js` — parallax hero
- `/app/frontend/src/components/ArticleCard.js`
- `/app/frontend/src/components/SearchSheet.js`
- `/app/frontend/src/components/FiltersSheet.js`
- `/app/frontend/src/constants.js`, `index.css`, `tailwind.config.js`
- `/app/design_guidelines.json`
- `/app/memory/test_credentials.md`, `/app/memory/PRD.md`
