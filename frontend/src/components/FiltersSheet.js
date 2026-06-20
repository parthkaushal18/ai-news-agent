import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { SRC_COLORS } from "../constants";

export default function FiltersSheet({ open, onClose, sources, activeSrc, onSelect }) {
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
            className="absolute inset-0 z-30 bg-ink/30 backdrop-blur-sm"
          />
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="absolute left-0 right-0 bottom-0 z-40 bg-paper border-t-2 border-ink rounded-t-none max-h-[80%] flex flex-col"
            data-testid="filters-sheet"
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-bone">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">/ filter by</p>
                <h2 className="font-heading font-extrabold text-2xl tracking-tight text-ink">Source</h2>
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

            <div className="flex-1 overflow-y-auto app-shell">
              <button
                onClick={() => onSelect(null)}
                className={`w-full flex items-center justify-between px-5 py-3 border-b border-bone tactile ${
                  !activeSrc ? "bg-ink text-paper" : "hover:bg-bone/50"
                }`}
                data-testid="filter-source-all"
              >
                <span className="font-heading font-bold text-base">All sources</span>
                <span className="font-mono text-xs">{sources.reduce((acc, s) => acc + s.count, 0)}</span>
              </button>

              {sources.map((s, i) => (
                <button
                  key={s.name}
                  onClick={() => onSelect(s.name)}
                  className={`w-full flex items-center gap-3 px-5 py-3 border-b border-bone tactile ${
                    activeSrc === s.name ? "bg-ink text-paper" : "hover:bg-bone/50"
                  }`}
                  data-testid={`filter-source-${i}`}
                >
                  <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: SRC_COLORS[s.name] || "#525252" }} />
                  <span className="font-heading font-semibold text-[15px] truncate flex-1 text-left">{s.name}</span>
                  <span className={`font-mono text-xs ${activeSrc === s.name ? "text-paper/80" : "text-faint"}`}>
                    {s.count}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
