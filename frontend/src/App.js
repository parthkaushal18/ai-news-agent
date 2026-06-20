import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  ArrowsClockwise,
  Lightning,
  Newspaper,
  TrendUp,
  MagnifyingGlass,
  BookmarkSimple,
  Funnel,
} from "@phosphor-icons/react";

import { CAT_COLORS, formatCountdown } from "./constants";
import ArticleCard from "./components/ArticleCard";
import HeroStory from "./components/HeroStory";
import SearchSheet from "./components/SearchSheet";
import FiltersSheet from "./components/FiltersSheet";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND}/api`;

const TAB_ICONS = {
  feed: Newspaper,
  trending: TrendUp,
  search: MagnifyingGlass,
  saved: BookmarkSimple,
};

const TABS = [
  { id: "feed", label: "Feed" },
  { id: "trending", label: "Trending" },
  { id: "search", label: "Search" },
  { id: "saved", label: "Saved" },
];

function useSaved() {
  const [saved, setSaved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ai-news:saved") || "[]");
    } catch {
      return [];
    }
  });
  const toggle = useCallback((id) => {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("ai-news:saved", JSON.stringify(next));
      return next;
    });
  }, []);
  return [saved, toggle];
}

export default function App() {
  const [articles, setArticles] = useState([]);
  const [sources, setSources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [activeCat, setActiveCat] = useState(null);
  const [activeSrc, setActiveSrc] = useState(null);
  const [tab, setTab] = useState("feed");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [saved, toggleSave] = useSaved();
  const [countdown, setCountdown] = useState(0);

  const loadAll = useCallback(async () => {
    try {
      const [news, sourcesRes, healthRes] = await Promise.all([
        axios.get(`${API}/news?limit=120`),
        axios.get(`${API}/sources`),
        axios.get(`${API}/health`),
      ]);
      setArticles(news.data.articles || []);
      setSources(sourcesRes.data.sources || []);
      setCategories(sourcesRes.data.categories || []);
      setHealth(healthRes.data);
      setCountdown(healthRes.data.next_fetch_in || 0);
      setError(null);
    } catch (e) {
      console.error("load error", e);
      setError(e.message || "Could not reach the news agent");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [loadAll]);

  useEffect(() => {
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await axios.post(`${API}/refresh`);
      // Poll a couple of times to give fetch a chance to complete
      setTimeout(loadAll, 4000);
      setTimeout(() => {
        loadAll();
        setRefreshing(false);
      }, 15000);
    } catch (e) {
      console.error(e);
      setRefreshing(false);
    }
  };

  // Apply filters
  const filtered = useMemo(() => {
    let items = articles;
    if (activeCat) items = items.filter((a) => a.category === activeCat);
    if (activeSrc) items = items.filter((a) => a.source === activeSrc);
    return items;
  }, [articles, activeCat, activeSrc]);

  // Hero = first item in current filter
  const hero = filtered[0];
  const restOfFeed = filtered.slice(1);

  // Trending: top 20 articles from Hacker News + Community, sorted by published desc
  const trending = useMemo(() => {
    return articles
      .filter((a) => a.source === "Hacker News" || a.category === "Community")
      .slice(0, 20);
  }, [articles]);

  const savedArticles = useMemo(
    () => articles.filter((a) => saved.includes(a.id)),
    [articles, saved]
  );

  // Switch tab — pre-open relevant sheets
  useEffect(() => {
    if (tab === "search") setSearchOpen(true);
  }, [tab]);

  const onTab = (id) => {
    if (id === "search") {
      setSearchOpen(true);
      return;
    }
    setTab(id);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    if (tab === "search") setTab("feed");
  };

  return (
    <div className="min-h-[100dvh] bg-ink flex justify-center">
      {/* Phone-frame container — full bleed on mobile, framed on desktop */}
      <div
        className="relative app-shell w-full max-w-md min-h-[100dvh] bg-paper overflow-hidden flex flex-col grain"
        data-testid="app-shell"
      >
        {/* ── Top Bar ── */}
        <header className="relative z-10 flex items-center gap-3 px-5 pt-5 pb-3 border-b border-ink bg-paper">
          <div className="flex items-center gap-2">
            <div className="relative w-7 h-7 bg-ink flex items-center justify-center">
              <Lightning size={14} weight="fill" className="text-klein" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-signal animate-pulse" />
            </div>
            <div className="leading-none">
              <p className="font-heading font-black text-[18px] tracking-[-0.02em] text-ink">SYNAPSE</p>
              <p className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-muted mt-0.5">AI NEWS TERMINAL</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setFiltersOpen(true)}
              className="relative p-2 tactile text-ink"
              aria-label="Filter sources"
              data-testid="top-filters-btn"
            >
              <Funnel size={18} weight={activeSrc ? "fill" : "regular"} />
              {activeSrc && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-klein" />}
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

        {/* ── Stats Strip ── */}
        <div
          className="relative z-10 bg-ink text-paper px-5 py-1.5 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.16em] overflow-hidden"
          data-testid="stats-strip"
        >
          <span><b className="text-amber">{articles.length}</b>&nbsp;stories</span>
          <span className="text-bone/40">·</span>
          <span><b className="text-amber">{health?.sources ?? "—"}</b>&nbsp;sources</span>
          <span className="text-bone/40">·</span>
          <span>NEXT&nbsp;<b className="text-amber">{formatCountdown(countdown)}</b></span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
            LIVE
          </span>
        </div>

        {/* ── Content ── */}
        <main className="relative z-10 flex-1 overflow-y-auto app-shell pb-tab">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={loadAll} />
          ) : articles.length === 0 ? (
            <EmptyState onRefresh={onRefresh} refreshing={refreshing} />
          ) : tab === "feed" ? (
            <FeedScreen
              hero={hero}
              feed={restOfFeed}
              categories={categories}
              activeCat={activeCat}
              setActiveCat={setActiveCat}
              activeSrc={activeSrc}
              setActiveSrc={setActiveSrc}
              saved={saved}
              toggleSave={toggleSave}
            />
          ) : tab === "trending" ? (
            <TrendingScreen articles={trending} saved={saved} toggleSave={toggleSave} />
          ) : tab === "saved" ? (
            <SavedScreen articles={savedArticles} saved={saved} toggleSave={toggleSave} />
          ) : null}
        </main>

        {/* ── Bottom Tab Bar ── */}
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
                  <Icon size={20} weight={active ? "fill" : "regular"} className={active ? "text-ink" : "text-muted"} />
                  <span
                    className={`font-mono text-[9px] uppercase tracking-[0.18em] ${
                      active ? "text-ink font-bold" : "text-muted"
                    }`}
                  >
                    {t.label}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="tab-dot"
                      className="absolute bottom-2 w-1 h-1 rounded-full bg-klein"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* ── Sheets ── */}
        <SearchSheet open={searchOpen} onClose={closeSearch} articles={articles} />
        <FiltersSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          sources={sources}
          activeSrc={activeSrc}
          onSelect={(s) => {
            setActiveSrc(s);
            setFiltersOpen(false);
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-screens
// ─────────────────────────────────────────────────────────────────────────────

function FeedScreen({ hero, feed, categories, activeCat, setActiveCat, activeSrc, setActiveSrc, saved, toggleSave }) {
  return (
    <>
      {/* Category chip rail */}
      <div className="border-b border-bone bg-paper sticky top-0 z-10">
        <div className="flex items-center gap-2 px-5 py-3 overflow-x-auto no-scrollbar">
          <Chip active={!activeCat && !activeSrc} onClick={() => { setActiveCat(null); setActiveSrc(null); }} testId="chip-all">
            ALL
          </Chip>
          {categories.map((c, i) => (
            <Chip
              key={c.name}
              active={activeCat === c.name}
              dot={CAT_COLORS[c.name]}
              onClick={() => { setActiveCat(activeCat === c.name ? null : c.name); setActiveSrc(null); }}
              testId={`chip-cat-${i}`}
            >
              {c.name}
              <span className="ml-1.5 font-mono text-[9px] opacity-70">{c.count}</span>
            </Chip>
          ))}
        </div>
      </div>

      {/* Active filter banner */}
      {activeSrc && (
        <div className="px-5 py-2 bg-klein text-paper font-mono text-[10px] uppercase tracking-[0.18em] flex items-center justify-between">
          <span>FILTERING · {activeSrc}</span>
          <button onClick={() => setActiveSrc(null)} className="underline tactile" data-testid="clear-src-filter">
            CLEAR
          </button>
        </div>
      )}

      {hero && <HeroStory article={hero} />}

      <div className="px-5 pt-5 pb-3 flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">/ stream</p>
          <h2 className="font-heading font-extrabold text-2xl tracking-tight text-ink">Latest dispatches</h2>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          {feed.length} ITEM{feed.length !== 1 ? "S" : ""}
        </p>
      </div>

      {feed.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">/ empty</p>
          <p className="mt-2 font-heading text-lg font-bold text-ink">No stories in this filter</p>
        </div>
      ) : (
        feed.map((a, i) => (
          <ArticleCard key={a.id || i} article={a} index={i} saved={saved} onToggleSave={toggleSave} />
        ))
      )}

      <Footer />
    </>
  );
}

function TrendingScreen({ articles, saved, toggleSave }) {
  return (
    <>
      <div className="px-5 pt-6 pb-2 border-b border-bone">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-signal">/ trending now</p>
        <h2 className="font-heading font-black text-3xl tracking-[-0.02em] text-ink leading-none">
          Community pulse.
        </h2>
        <p className="mt-2 text-sm text-muted">What the Hacker News crowd is voting up right now.</p>
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
            saved={saved}
            onToggleSave={toggleSave}
            testIdPrefix="trending-card"
          />
        ))
      )}
      <Footer />
    </>
  );
}

function SavedScreen({ articles, saved, toggleSave }) {
  return (
    <>
      <div className="px-5 pt-6 pb-3 border-b border-bone">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-klein">/ archive</p>
        <h2 className="font-heading font-black text-3xl tracking-[-0.02em] text-ink leading-none">
          Saved for later.
        </h2>
        <p className="mt-2 text-sm text-muted">
          {articles.length} article{articles.length !== 1 ? "s" : ""} pinned to your device.
        </p>
      </div>
      {articles.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <div className="mx-auto w-12 h-12 border-2 border-ink flex items-center justify-center mb-3">
            <BookmarkSimple size={22} weight="bold" className="text-ink" />
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">/ empty stack</p>
          <p className="mt-2 font-heading text-lg font-bold text-ink">Nothing saved yet</p>
          <p className="mt-1 text-sm text-muted">Tap the bookmark on any article to pin it here.</p>
        </div>
      ) : (
        articles.map((a, i) => (
          <ArticleCard
            key={a.id || i}
            article={a}
            index={i}
            saved={saved}
            onToggleSave={toggleSave}
            testIdPrefix="saved-card"
          />
        ))
      )}
      <Footer />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small UI atoms
// ─────────────────────────────────────────────────────────────────────────────

function Chip({ active, dot, onClick, children, testId }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`shrink-0 px-3.5 py-1.5 rounded-full border tactile font-mono text-[11px] uppercase tracking-[0.12em] flex items-center gap-1.5 ${
        active ? "bg-ink text-paper border-ink" : "bg-transparent text-ink border-ink/70 hover:bg-bone/60"
      }`}
    >
      {dot && <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: dot }} />}
      {children}
    </button>
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
    <footer className="px-5 py-10 mt-2 border-t border-bone text-center">
      <p className="font-mono text-[9px] tracking-[0.22em] uppercase text-faint">
        SYNAPSE · AI NEWS TERMINAL
      </p>
      <p className="mt-1 font-mono text-[9px] tracking-[0.22em] uppercase text-faint">
        FETCHED FROM 12 SOURCES · UPDATED EVERY 30 MIN
      </p>
    </footer>
  );
}
