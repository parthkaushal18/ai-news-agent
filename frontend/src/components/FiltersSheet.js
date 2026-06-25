import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowCounterClockwise } from "@phosphor-icons/react";
import { CAT_COLORS } from "../constants";

/**
 * Rich Filters sheet — replaces the old single-source picker.
 * Lets the user pick:
 *  - a time window (anytime / past hour / past 24h / past week)
 *  - a sort order (newest / trending / most discussed)
 *  - one or many categories
 *
 * The sheet manages its own local state; "Apply" emits the chosen filters,
 * "Reset" returns everything to defaults.
 */

export const DEFAULT_FILTERS = {
  window: "anytime",
  sort: "newest",
  categories: [], // empty = all
};

const WINDOWS = [
  { id: "anytime", label: "Anytime" },
  { id: "1h", label: "Past hour" },
  { id: "24h", label: "Past 24h" },
  { id: "7d", label: "Past week" },
];

const SORTS = [
  { id: "newest", label: "Newest" },
  { id: "trending", label: "Trending" },
  { id: "discussed", label: "Most discussed" },
];

export default function FiltersSheet({ open, onClose, value, onApply, categories = [] }) {
  const [draft, setDraft] = useState(value || DEFAULT_FILTERS);

  // Sync incoming filter state every time the sheet opens
  useEffect(() => {
    if (open) setDraft(value || DEFAULT_FILTERS);
  }, [open, value]);

  const toggleCat = (name) =>
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(name)
        ? d.categories.filter((c) => c !== name)
        : [...d.categories, name],
    }));

  const apply = () => {
    onApply?.(draft);
    onClose?.();
  };
  const reset = () => setDraft(DEFAULT_FILTERS);

  const isDirty =
    draft.window !== DEFAULT_FILTERS.window ||
    draft.sort !== DEFAULT_FILTERS.sort ||
    draft.categories.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-30 bg-ink/35 backdrop-blur-sm"
          />
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="absolute left-0 right-0 bottom-0 z-40 bg-paper border-t-2 border-ink flex flex-col max-h-[85%]"
            data-testid="filters-sheet"
          >
            {/* handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-9 h-1 rounded-full bg-ink/30" />
            </div>

            {/* header */}
            <header className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-bone">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">/ refine</p>
                <h2 className="font-heading font-black text-[26px] tracking-[-0.03em] text-ink leading-none">
                  Filters
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 -m-2 tactile text-muted hover:text-ink"
                aria-label="Close filters"
                data-testid="filters-close-btn"
              >
                <X size={22} weight="bold" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto app-shell px-5 py-5 space-y-7">
              {/* Time window */}
              <Section label="01" title="Time window">
                <div className="grid grid-cols-2 gap-2">
                  {WINDOWS.map((w, i) => (
                    <Pill
                      key={w.id}
                      active={draft.window === w.id}
                      onClick={() => setDraft((d) => ({ ...d, window: w.id }))}
                      testId={`filter-window-${w.id}`}
                    >
                      {w.label}
                    </Pill>
                  ))}
                </div>
              </Section>

              {/* Sort */}
              <Section label="02" title="Sort by">
                <div className="grid grid-cols-1 gap-2">
                  {SORTS.map((s) => (
                    <Pill
                      key={s.id}
                      active={draft.sort === s.id}
                      onClick={() => setDraft((d) => ({ ...d, sort: s.id }))}
                      testId={`filter-sort-${s.id}`}
                      full
                    >
                      {s.label}
                    </Pill>
                  ))}
                </div>
              </Section>

              {/* Categories */}
              <Section
                label="03"
                title="Categories"
                hint={draft.categories.length === 0 ? "All included" : `${draft.categories.length} selected`}
              >
                <div className="flex flex-wrap gap-2">
                  {categories.map((c, i) => {
                    const active = draft.categories.includes(c.name);
                    return (
                      <button
                        key={c.name}
                        onClick={() => toggleCat(c.name)}
                        data-testid={`filter-category-${i}`}
                        className={`tactile inline-flex items-center gap-1.5 px-3 py-1.5 border font-mono text-[11px] uppercase tracking-[0.12em] ${
                          active
                            ? "bg-ink text-paper border-ink"
                            : "bg-transparent text-ink border-ink/40 hover:border-ink"
                        }`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: active ? "#fff" : CAT_COLORS[c.name] || "#525252" }}
                        />
                        {c.name}
                        <span className="opacity-60 ml-1 text-[9px]">{c.count}</span>
                      </button>
                    );
                  })}
                </div>
              </Section>
            </div>

            {/* footer actions */}
            <footer className="px-5 py-3 border-t border-bone bg-paper flex items-center gap-2 bottom-safe">
              <button
                onClick={reset}
                disabled={!isDirty}
                className="px-3 py-2.5 tactile font-mono text-[11px] uppercase tracking-[0.18em] text-ink inline-flex items-center gap-1.5 disabled:opacity-40"
                data-testid="filters-reset-btn"
              >
                <ArrowCounterClockwise size={13} weight="bold" />
                Reset
              </button>
              <button
                onClick={apply}
                className="ml-auto px-5 py-2.5 bg-ink text-paper tactile font-mono text-[11px] uppercase tracking-[0.18em] font-bold"
                data-testid="filters-apply-btn"
              >
                Apply
                {isDirty && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-amber" />}
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ label, title, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-2.5">
        <p className="font-heading font-black text-[22px] leading-none tracking-[-0.03em] text-ink/15">
          {label}
        </p>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-faint">/ {title}</p>
        {hint && <p className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Pill({ active, onClick, children, testId, full }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`tactile font-heading text-[14px] font-semibold tracking-tight px-3 py-2.5 border ${
        full ? "text-left" : "text-center"
      } ${active ? "bg-ink text-paper border-ink" : "bg-transparent text-ink border-ink/35 hover:border-ink"}`}
    >
      <span className="inline-flex items-center gap-2">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            active ? "bg-amber" : "bg-ink/20"
          }`}
        />
        {children}
      </span>
    </button>
  );
}
