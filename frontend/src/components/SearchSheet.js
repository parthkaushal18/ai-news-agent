import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MagnifyingGlass } from "@phosphor-icons/react";
import { SRC_COLORS, CAT_COLORS, timeAgo } from "../constants";

export default function SearchSheet({ open, onClose, articles, onOpen }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 240);
    } else {
      setQ("");
    }
  }, [open]);

  const query = q.trim().toLowerCase();
  const results = !query
    ? []
    : articles.filter(
        (a) =>
          (a.title || "").toLowerCase().includes(query) ||
          (a.summary || "").toLowerCase().includes(query) ||
          (a.source || "").toLowerCase().includes(query) ||
          (a.category || "").toLowerCase().includes(query)
      );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="search"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-0 z-40 bg-paper flex flex-col"
          data-testid="search-sheet"
        >
          <header className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-bone">
            <MagnifyingGlass size={22} weight="bold" className="text-ink shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search articles, sources…"
              className="flex-1 font-heading text-[26px] font-extrabold tracking-tight bg-transparent outline-none placeholder:text-faint text-ink"
              data-testid="search-input"
            />
            <button
              onClick={onClose}
              className="p-2 -m-2 tactile text-muted hover:text-ink"
              aria-label="Close search"
              data-testid="search-close-btn"
            >
              <X size={22} weight="bold" />
            </button>
          </header>

          <div className="bg-ink text-paper px-5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] flex justify-between">
            <span>SEARCH</span>
            <span>{query ? `${results.length} HIT${results.length !== 1 ? "S" : ""}` : "TYPE TO BEGIN"}</span>
          </div>

          <div className="flex-1 overflow-y-auto app-shell">
            {!query ? (
              <div className="px-5 py-12 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">/ idle</p>
                <p className="mt-3 font-heading text-xl font-bold text-ink">Find any AI story.</p>
                <p className="mt-1 text-sm text-muted">
                  Try <span className="font-mono text-ink">&ldquo;GPT&rdquo;</span>,{" "}
                  <span className="font-mono text-ink">&ldquo;DeepMind&rdquo;</span>, or{" "}
                  <span className="font-mono text-ink">&ldquo;agent&rdquo;</span>.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-signal">/ no results</p>
                <p className="mt-3 font-heading text-xl font-bold text-ink">Nothing matches &ldquo;{q}&rdquo;</p>
              </div>
            ) : (
              results.map((a, i) => (
                <button
                  key={a.id || i}
                  type="button"
                  onClick={() => {
                    onOpen?.(a);
                    onClose?.();
                  }}
                  className="block w-full text-left px-5 py-4 border-b border-bone tactile hover:bg-bone/40"
                  data-testid={`search-result-${i}`}
                >
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                    <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: SRC_COLORS[a.source] || "#525252" }} />
                    <span className="text-ink font-semibold truncate">{a.source}</span>
                    <span className="text-faint">/</span>
                    <span style={{ color: CAT_COLORS[a.category] || "#525252" }} className="font-semibold">
                      {a.category}
                    </span>
                    <span className="ml-auto text-faint">{timeAgo(a.published)}</span>
                  </div>
                  <h3 className="mt-1.5 font-heading font-bold text-[16px] leading-snug text-ink line-clamp-2">{a.title}</h3>
                </button>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
