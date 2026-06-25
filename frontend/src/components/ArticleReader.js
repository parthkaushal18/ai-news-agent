import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CaretLeft,
  ArrowUpRight,
  BookmarkSimple,
  Share,
  Copy,
  Check,
  Clock,
} from "@phosphor-icons/react";
import { SRC_COLORS, CAT_COLORS, timeAgo, HERO_IMG } from "../constants";

function readTime(text) {
  const w = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(w / 200));
}

/**
 * Full-screen in-app article reader. Most external news sites block iframes
 * so we show a rich preview (image, title, summary) plus a prominent
 * "OPEN ORIGINAL" call-to-action.
 */
export default function ArticleReader({ article, onClose, saved, onToggleSave }) {
  const [copied, setCopied] = useState(false);
  const open = !!article;

  const a = article || {};
  const sc = SRC_COLORS[a.source] || "#0A0A0A";
  const cc = CAT_COLORS[a.category] || "#0A0A0A";
  const mins = readTime(a.summary || a.title);
  const isSaved = saved?.includes(a.id);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: a.title, text: a.summary, url: a.url });
        return;
      } catch {
        /* user cancelled or unsupported */
      }
    }
    try {
      await navigator.clipboard.writeText(a.url || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="article-reader"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="absolute inset-0 z-40 bg-paper flex flex-col"
          data-testid="article-reader"
        >
          {/* sticky header */}
          <header className="flex items-center gap-2 px-4 py-3 border-b border-ink bg-paper">
            <button
              onClick={onClose}
              className="p-2 -ml-2 tactile text-ink"
              aria-label="Back"
              data-testid="reader-close-btn"
            >
              <CaretLeft size={22} weight="bold" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-faint truncate">
                READER · {a.source}
              </p>
            </div>
            <button
              onClick={handleShare}
              className="p-2 tactile text-ink"
              aria-label="Share"
              data-testid="reader-share-btn"
            >
              {copied ? (
                <Check size={20} weight="bold" className="text-klein" />
              ) : navigator.share ? (
                <Share size={20} weight="bold" />
              ) : (
                <Copy size={20} weight="bold" />
              )}
            </button>
            <button
              onClick={() => onToggleSave?.(a.id)}
              className="p-2 -mr-2 tactile"
              aria-label={isSaved ? "Unsave" : "Save"}
              data-testid="reader-save-btn"
            >
              <BookmarkSimple
                size={20}
                weight={isSaved ? "fill" : "regular"}
                className={isSaved ? "text-klein" : "text-ink"}
              />
            </button>
          </header>

          {/* content */}
          <div className="flex-1 overflow-y-auto app-shell" data-testid="reader-content">
            {/* hero */}
            <div className="relative w-full h-[240px] overflow-hidden border-b border-ink">
              <motion.img
                initial={{ scale: 1.05, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6 }}
                src={HERO_IMG}
                alt={a.title}
                className="w-full h-full object-cover grayscale contrast-110"
              />
              {/* scanlines */}
              <div
                className="absolute inset-0 pointer-events-none opacity-15"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent 0 2px, #000 2px 3px)",
                }}
              />
              <div className="absolute top-3 left-3 font-mono text-[9px] tracking-[0.18em] uppercase bg-ink text-paper px-2 py-1">
                {a.category}
              </div>
              <div className="absolute bottom-3 right-3 font-mono text-[9px] tracking-[0.18em] uppercase bg-paper text-ink px-2 py-1 border border-ink">
                READER · {String(mins).padStart(2, "0")} MIN
              </div>
            </div>

            <article className="px-5 py-6">
              {/* meta */}
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: sc }} />
                <span className="text-ink font-bold">{a.source}</span>
                <span className="text-faint">/</span>
                <span style={{ color: cc }} className="font-semibold">{a.category}</span>
                <span className="ml-auto inline-flex items-center gap-1 text-faint">
                  <Clock size={11} weight="bold" />
                  {timeAgo(a.published)}
                </span>
              </div>

              {/* headline */}
              <motion.h1
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="mt-3 font-heading font-black text-[30px] leading-[1.02] tracking-[-0.025em] text-ink"
              >
                {a.title}
              </motion.h1>

              {/* summary */}
              {a.summary && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  className="mt-5 text-[15px] leading-[1.62] text-ink/85 font-body"
                >
                  <span className="float-left font-heading font-black text-[44px] leading-[0.85] mt-1 mr-2 text-klein">
                    {a.summary.charAt(0)}
                  </span>
                  {a.summary.slice(1)}
                </motion.div>
              )}

              {/* divider */}
              <div className="mt-7 mb-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-ink" />
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                  CONTINUE READING ON
                </p>
                <div className="h-px flex-1 bg-ink" />
              </div>

              {/* big CTA */}
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block tactile group"
                data-testid="reader-open-original-btn"
              >
                <div className="border-2 border-ink bg-ink text-paper px-5 py-5 flex items-center gap-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:shadow-[6px_6px_0_0_#0000FF]">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: sc }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/60">
                      OPEN ON
                    </p>
                    <p className="font-heading font-extrabold text-lg tracking-tight truncate">
                      {a.source}.com
                    </p>
                  </div>
                  <ArrowUpRight size={22} weight="bold" />
                </div>
              </a>

              <p className="mt-3 text-center font-mono text-[9.5px] uppercase tracking-[0.22em] text-faint">
                Opens in a new tab · External site
              </p>

              {/* tail nav */}
              <div className="mt-10 mb-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                <span>// END OF PREVIEW</span>
                <button
                  onClick={onClose}
                  className="underline hover:text-ink tactile"
                  data-testid="reader-back-link"
                >
                  Back to feed
                </button>
              </div>
            </article>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
