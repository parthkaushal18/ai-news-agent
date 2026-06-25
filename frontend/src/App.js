import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowsClockwise,
  Newspaper,
  TrendUp,
  MagnifyingGlass,
  BookmarkSimple,
  SlidersHorizontal,
  Sparkle,
  BellRinging,
  Bell,
  BellSlash,
} from "@phosphor-icons/react";

import { CAT_COLORS, formatCountdown } from "./constants";
import Logo from "./components/Logo";
import Splash from "./components/Splash";
import Counter from "./components/Counter";
import ArticleCard from "./components/ArticleCard";
import HeroStory from "./components/HeroStory";
import SearchSheet from "./components/SearchSheet";
import FiltersSheet, { DEFAULT_FILTERS } from "./components/FiltersSheet";
import ArticleReader from "./components/ArticleReader";
import NewStoriesToast from "./components/NewStoriesToast";
import useLiveNotifications from "./hooks/useLiveNotifications";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND}/api`;

const TAB_ICONS = { feed: Newspaper, trending: TrendUp, search: MagnifyingGlass, saved: BookmarkSimple };
const TABS = [
  { id: "feed", label: "Feed" },
  { id: "trending", label: "Trending" },
  { id: "search", label: "Search" },
  { id: "saved", label: "Saved" },
];

const WINDOW_MS = { anytime: Infinity, "1h": 3.6e6, "24h": 8.64e7, "7d": 6.048e8 };

function useSaved() {
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ai-news:saved") || "[]"); } catch { return []; }
  });
  const toggle = useCallback((id) => {
    setSaved((p) => {
      const next = p.includes(id) ? p.filter((x) => x !== id) : [...p, id];
      localStorage.setItem("ai-news:saved", JSON.stringify(next));
      return next;
    });
  }, []);
  return [saved, toggle];
}

function commentsOf(article) {
  const m = (article.summary || "").match(/(\d+)\s*comments/i);
  return m ? parseInt(m[1], 10) : 0;
}

function applyFilters(articles, f) {
  if (!Array.isArray(articles)) return [];
  const winMs = WINDOW_MS[f.window] ?? Infinity;
  const now = Date.now();
  let items = articles.filter((a) => {
    if (f.categories?.length && !f.categories.includes(a.category)) return false;
    if (winMs !== Infinity) {
      const t = a.published ? new Date(a.published).getTime() : 0;
      if (!t || now - t > winMs) return false;
    }
    return true;
  });

  if (f.sort === "discussed") {
    items = [...items].sort((a, b) => commentsOf(b) - commentsOf(a));
  } else if (f.sort === "trending") {
    items = [...items].sort((a, b) => {
      const ts = (x) => {
        const ageH = (now - new Date(x.published || 0).getTime()) / 3.6e6;
        return Math.max(0, 24 - ageH) + (x.source === "Hacker News" ? commentsOf(x) / 4 : 0);
      };
      return ts(b) - ts(a);
    });
  }
  return items;
}

export default function App() {
  const [articles, setArticles] = useState([]);
  const [trending, setTrending] = useState([]);
  const [sources, setSources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [tab, setTab] = useState("feed");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [reader, setReader] = useState(null);

  const [saved, toggleSave] = useSaved();
  const [countdown, setCountdown] = useState(0);
  const mainRef = useRef(null);

  const loadAll = useCallback(async () => {
    try {
      const [news, trend, srcRes, healthRes] = await Promise.all([
        axios.get(`${API}/news?limit=120`),
        axios.get(`${API}/trending?limit=20`),
        axios.get(`${API}/sources`),
        axios.get(`${API}/health`),
      ]);
      setArticles(news.data.articles || []);
      setTrending(trend.data.articles || []);
      setSources(srcRes.data.sources || []);
      setCategories(srcRes.data.categories || []);
      setHealth(healthRes.data);
      setCountdown(healthRes.data.next_fetch_in || 0);
      setError(null);
    } catch (e) {
      setError(e.message || "Could not reach the news agent");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial + interval auto-refresh + on tab focus
  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 60 * 1000); // every minute
    const onVis = () => { if (!document.hidden) loadAll(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [loadAll]);

  useEffect(() => {
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // Live notifications
  const { permission, requestPermission, unseenIds, dismissAll } = useLiveNotifications(
    articles,
    { enabled: true, max: 3 }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await axios.post(`${API}/refresh`);
      setTimeout(loadAll, 3500);
      setTimeout(() => { loadAll(); setRefreshing(false); }, 12000);
    } catch { setRefreshing(false); }
  };

  // Apply filters to the global articles list
  const filtered = useMemo(() => applyFilters(articles, filters), [articles, filters]);
  const hero = filtered[0];
  const restOfFeed = filtered.slice(1);

  const savedArticles = useMemo(
    () => articles.filter((a) => saved.includes(a.id)),
    [articles, saved]
  );

  const onTab = (id) => {
    if (id === "search") { setSearchOpen(true); return; }
    setTab(id);
    requestAnimationFrame(() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  };
  const closeSearch = () => { setSearchOpen(false); if (tab === "search") setTab("feed"); };

  const openReader = useCallback((a) => setReader(a), []);
  const closeReader = useCallback(() => setReader(null), []);

  const onTapNewStories = () => {
    dismissAll();
    setTab("feed");
    setFilters(DEFAULT_FILTERS);
    requestAnimationFrame(() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  };

  // Active filter count (for the funnel badge)
  const activeFilterCount =
    (filters.window !== "anytime" ? 1 : 0) +
    (filters.sort !== "newest" ? 1 : 0) +
    (filters.categories?.length || 0);

  return (
    <div className="h-[100dvh] bg-ink flex justify-center overflow-hidden">
      <div
        className="relative app-shell w-full max-w-md h-full bg-paper overflow-hidden flex flex-col grain"
        data-testid="app-shell"
      >
        {!splashDone && <Splash onDone={() => setSplashDone(true)} />}

        {/* ── Top Bar ── */}
        <header className="relative z-10 flex items-center gap-3 px-5 pt-5 pb-3 border-b border-ink bg-paper">
          <Logo size={32} />
          <div className="leading-none">
            <p className="font-heading font-black text-[18px] tracking-[-0.03em] text-ink">
              SYN<span className="text-klein">·</span>APSE
            </p>
            <p className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-muted mt-0.5">
              AI NEWS TERMINAL
            </p>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <BellButton permission={permission} onClick={requestPermission} />
            <button
              onClick={() => setFiltersOpen(true)}
              className="relative p-2 tactile text-ink"
              aria-label="Filters"
              data-testid="top-filters-btn"
            >
              <SlidersHorizontal size={18} weight={activeFilterCount ? "fill" : "regular"} />
              {activeFilterCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-klein text-paper text-[8px] font-mono font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              onClick={onRefresh}
              className="p-2 tactile text-ink"
              aria-label="Refresh"
              disabled={refreshing}
              data-testid="top-refresh-btn"
            >
              <ArrowsClockwise size={18} weight="bold" className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {/* Stats Strip */}
        <div
          className="relative z-10 bg-ink text-paper px-5 py-1.5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] overflow-hidden"
          data-testid="stats-strip"
        >
          <span><b className="text-amber"><Counter value={articles.length} /></b>&nbsp;STORIES</span>
          <span className="text-bone/30">·</span>
          <span><b className="text-amber"><Counter value={health?.sources ?? 0} /></b>&nbsp;SOURCES</span>
          <span className="text-bone/30">·</span>
          <span>NEXT <b className="text-amber">{formatCountdown(countdown)}</b></span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
            LIVE
          </span>
        </div>

        {/* New-stories toast */}
        <NewStoriesToast
          count={unseenIds.length}
          onTap={onTapNewStories}
          onDismiss={dismissAll}
        />

        {/* Source marquee */}
        {!loading && sources.length > 0 && (
          <div className="relative z-10 bg-paper border-b border-bone overflow-hidden whitespace-nowrap py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
            <div className="inline-flex animate-marquee gap-6 pr-6">
              {[...sources, ...sources].map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-ink" />
                  {s.name}
                  <span className="text-ink/30">[{s.count}]</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <main ref={mainRef} className="relative z-10 flex-1 overflow-y-auto app-shell pb-tab">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={loadAll} />
          ) : articles.length === 0 ? (
            <EmptyState onRefresh={onRefresh} refreshing={refreshing} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {tab === "feed" && (
                  <FeedScreen
                    hero={hero}
                    feed={restOfFeed}
                    filters={filters}
                    setFilters={setFilters}
                    categories={categories}
                    saved={saved}
                    toggleSave={toggleSave}
                    openReader={openReader}
                  />
                )}
                {tab === "trending" && (
                  <TrendingScreen
                    articles={trending}
                    saved={saved}
                    toggleSave={toggleSave}
                    openReader={openReader}
                  />
                )}
                {tab === "saved" && (
                  <SavedScreen
                    articles={savedArticles}
                    saved={saved}
                    toggleSave={toggleSave}
                    openReader={openReader}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        {/* Bottom tabs */}
        <nav
          className="absolute left-0 right-0 bottom-0 z-20 bg-paper/85 backdrop-blur-xl border-t border-ink bottom-safe"
          data-testid="bottom-tab-nav"
        >
          <div className="flex justify-around items-stretch">
            {TABS.map((t) => {
              const Icon = TAB_ICONS[t.id];
              const active = tab === t.id || (t.id === "search" && searchOpen);
              return (
                <button
                  key={t.id}
                  onClick={() => onTab(t.id)}
                  className="flex-1 py-3 flex flex-col items-center gap-1 tactile relative"
                  data-testid={`bottom-tab-${t.id}`}
                >
                  <motion.div animate={{ y: active ? -1 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                    <Icon size={20} weight={active ? "fill" : "regular"} className={active ? "text-ink" : "text-muted"} />
                  </motion.div>
                  <span
                    className={`font-mono text-[9px] uppercase tracking-[0.18em] ${
                      active ? "text-ink font-bold" : "text-muted"
                    }`}
                  >
                    {t.label}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute -bottom-px left-1/4 right-1/4 h-[2px] bg-klein"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Sheets / Overlays */}
        <SearchSheet open={searchOpen} onClose={closeSearch} articles={articles} onOpen={openReader} />
        <FiltersSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          value={filters}
          categories={categories}
          onApply={(next) => {
            setFilters(next);
            requestAnimationFrame(() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
          }}
        />
        <ArticleReader
          article={reader}
          onClose={closeReader}
          saved={saved}
          onToggleSave={toggleSave}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-screens
// ─────────────────────────────────────────────────────────────────────────────

function FeedScreen({ hero, feed, filters, setFilters, categories, saved, toggleSave, openReader }) {
  // Chip rail: quick category toggle that syncs with multi-cat filter state.
  const toggleCat = (name) => {
    setFilters((f) => {
      const list = f.categories || [];
      const next = list.includes(name) ? list.filter((c) => c !== name) : [...list, name];
      return { ...f, categories: next };
    });
  };

  const selected = filters.categories || [];
  const isAll = selected.length === 0 && filters.window === "anytime" && filters.sort === "newest";

  return (
    <>
      <div className="border-b border-bone bg-paper sticky top-0 z-10">
        <div className="flex items-center gap-2 px-5 py-3 overflow-x-auto no-scrollbar">
          <Chip
            active={isAll}
            onClick={() => setFilters({ ...filters, categories: [] })}
            testId="chip-all"
          >
            ALL
          </Chip>
          {categories.map((c, i) => (
            <Chip
              key={c.name}
              active={selected.includes(c.name)}
              dot={CAT_COLORS[c.name]}
              onClick={() => toggleCat(c.name)}
              testId={`chip-cat-${i}`}
            >
              {c.name}
              <span className="ml-1.5 font-mono text-[9px] opacity-70">{c.count}</span>
            </Chip>
          ))}
        </div>
      </div>

      {/* Active-filter info banner (window + sort) */}
      {(filters.window !== "anytime" || filters.sort !== "newest") && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="px-5 py-2 bg-klein text-paper font-mono text-[10px] uppercase tracking-[0.18em] flex items-center justify-between"
        >
          <span>
            {filters.sort !== "newest" ? `${filters.sort.toUpperCase()} · ` : ""}
            {filters.window !== "anytime" ? filters.window.toUpperCase() : ""}
          </span>
          <button
            onClick={() => setFilters({ ...filters, window: "anytime", sort: "newest" })}
            className="underline tactile"
            data-testid="clear-filters-link"
          >
            CLEAR
          </button>
        </motion.div>
      )}

      {hero && <HeroStory article={hero} onOpen={openReader} />}

      <SectionHeader number="02" label="STREAM" title="Latest dispatches" count={feed.length} />

      {feed.length === 0 ? (
        <EmptyFilter />
      ) : (
        feed.map((a, i) => (
          <ArticleCard
            key={a.id || i}
            article={a}
            index={i}
            saved={saved}
            onToggleSave={toggleSave}
            onOpen={openReader}
          />
        ))
      )}

      <Footer />
    </>
  );
}

function TrendingScreen({ articles, saved, toggleSave, openReader }) {
  return (
    <>
      <div className="px-5 pt-7 pb-4 border-b border-bone bg-paper relative overflow-hidden">
        <div className="absolute top-3 right-3 w-12 h-12 crosshatch opacity-30 pointer-events-none" />
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-signal flex items-center gap-1.5">
          <Sparkle size={11} weight="fill" /> TRENDING NOW
        </p>
        <h2 className="mt-1 font-heading font-black text-[34px] tracking-[-0.03em] text-ink leading-none">
          What&rsquo;s hot.
        </h2>
        <p className="mt-2 text-sm text-muted">
          Top stories across all sources — ranked by recency and community signal.
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">/ quiet</p>
          <p className="mt-2 font-heading text-lg font-bold text-ink">No trending stories yet</p>
        </div>
      ) : (
        articles.map((a, i) => (
          <ArticleCard
            key={a.id || i}
            article={a}
            index={i}
            rank={i + 1}
            saved={saved}
            onToggleSave={toggleSave}
            onOpen={openReader}
            testIdPrefix="trending-card"
          />
        ))
      )}
      <Footer />
    </>
  );
}

function SavedScreen({ articles, saved, toggleSave, openReader }) {
  return (
    <>
      <div className="px-5 pt-7 pb-4 border-b border-bone relative overflow-hidden">
        <div className="absolute top-3 right-3 w-12 h-12 crosshatch opacity-30 pointer-events-none" />
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-klein flex items-center gap-1.5">
          <BookmarkSimple size={11} weight="fill" /> ARCHIVE
        </p>
        <h2 className="mt-1 font-heading font-black text-[34px] tracking-[-0.03em] text-ink leading-none">
          Saved for later.
        </h2>
        <p className="mt-2 text-sm text-muted">
          <Counter value={articles.length} /> article{articles.length !== 1 ? "s" : ""} pinned to your device.
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="mx-auto w-14 h-14 border-2 border-ink flex items-center justify-center mb-4"
          >
            <BookmarkSimple size={24} weight="bold" className="text-ink" />
          </motion.div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint">/ empty stack</p>
          <p className="mt-2 font-heading text-xl font-bold text-ink">Nothing saved yet</p>
          <p className="mt-1.5 text-sm text-muted">Tap the bookmark on any article to pin it here.</p>
        </div>
      ) : (
        articles.map((a, i) => (
          <ArticleCard
            key={a.id || i}
            article={a}
            index={i}
            saved={saved}
            onToggleSave={toggleSave}
            onOpen={openReader}
            testIdPrefix="saved-card"
          />
        ))
      )}
      <Footer />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────────────

function BellButton({ permission, onClick }) {
  const Icon = permission === "granted" ? BellRinging : permission === "denied" ? BellSlash : Bell;
  const tone =
    permission === "granted" ? "text-klein" : permission === "denied" ? "text-faint" : "text-ink";
  return (
    <button
      onClick={onClick}
      className={`relative p-2 tactile ${tone}`}
      aria-label="Notifications"
      data-testid="top-bell-btn"
      title={permission === "granted" ? "Live notifications enabled" : "Enable live notifications"}
    >
      <Icon size={18} weight={permission === "granted" ? "fill" : "regular"} />
      {permission === "granted" && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
      )}
    </button>
  );
}

function Chip({ active, dot, onClick, children, testId }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="relative shrink-0 px-3.5 py-1.5 rounded-full tactile font-mono text-[11px] uppercase tracking-[0.12em] flex items-center gap-1.5 z-10 border border-ink/70"
    >
      {active && (
        <motion.span
          layoutId={`chip-bg-${testId}`}
          className="absolute inset-0 rounded-full bg-ink"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span className={`relative z-10 inline-flex items-center gap-1.5 ${active ? "text-paper" : "text-ink"}`}>
        {dot && <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: active ? "#fff" : dot }} />}
        {children}
      </span>
    </button>
  );
}

function SectionHeader({ number, label, title, count }) {
  return (
    <div className="px-5 pt-6 pb-3 flex items-end justify-between gap-3">
      <div className="flex items-end gap-3">
        <p className="font-heading font-black text-[28px] leading-none tracking-[-0.03em] text-ink/15">{number}</p>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">/ {label}</p>
          <h2 className="mt-0.5 font-heading font-extrabold text-2xl tracking-tight text-ink">{title}</h2>
        </div>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted whitespace-nowrap">
        <Counter value={count} /> ITEM{count !== 1 ? "S" : ""}
      </p>
    </div>
  );
}

function EmptyFilter() {
  return (
    <div className="px-5 py-16 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint">/ empty</p>
      <p className="mt-2 font-heading text-lg font-bold text-ink">No stories in this filter</p>
      <p className="mt-1 text-sm text-muted">Try widening your time window or clearing categories.</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center" data-testid="loading-state">
      <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted">
        <span className="inline-block animate-pulse">// FETCHING FEEDS</span>
      </div>
      <div className="mt-6 w-32 h-1 bg-bone overflow-hidden">
        <motion.div
          className="h-full bg-ink"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          style={{ width: "50%" }}
        />
      </div>
      <div className="mt-8 w-full max-w-sm space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border-b border-bone pb-4 animate-pulse">
            <div className="h-3 w-32 bg-bone rounded" />
            <div className="mt-2 h-4 w-full bg-bone rounded" />
            <div className="mt-1.5 h-4 w-3/4 bg-bone rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center" data-testid="error-state">
      <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-signal">// CONNECTION LOST</p>
      <h2 className="mt-3 font-heading font-black text-3xl tracking-tight text-ink">Agent unreachable</h2>
      <p className="mt-2 text-sm text-muted break-all">{message}</p>
      <button
        onClick={onRetry}
        className="mt-6 px-5 py-2.5 bg-ink text-paper font-mono text-xs uppercase tracking-[0.18em] tactile"
        data-testid="error-retry-btn"
      >
        Retry connection
      </button>
    </div>
  );
}

function EmptyState({ onRefresh, refreshing }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 px-6 text-center" data-testid="empty-state">
      <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-faint">// COLD START</p>
      <h2 className="mt-3 font-heading font-black text-3xl tracking-tight text-ink">No stories cached.</h2>
      <p className="mt-2 text-sm text-muted">The agent has not fetched any articles yet.</p>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="mt-6 px-5 py-2.5 bg-ink text-paper font-mono text-xs uppercase tracking-[0.18em] tactile"
        data-testid="empty-fetch-btn"
      >
        {refreshing ? "Fetching…" : "Fetch news now"}
      </button>
    </div>
  );
}

function Footer() {
  return (
    <footer className="px-5 py-10 mt-2 border-t border-bone text-center relative overflow-hidden">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Logo size={22} />
        <span className="font-heading font-black text-[12px] tracking-[-0.02em] text-ink">
          SYN<span className="text-klein">·</span>APSE
        </span>
      </div>
      <p className="font-mono text-[9px] tracking-[0.22em] uppercase text-faint">
        FETCHED FROM 12 SOURCES · AUTO-REFRESH EVERY MIN
      </p>
      <p className="mt-1 font-mono text-[9px] tracking-[0.22em] uppercase text-faint">
        // END OF FEED //
      </p>
    </footer>
  );
}
