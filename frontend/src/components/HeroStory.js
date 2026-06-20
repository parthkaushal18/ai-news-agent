import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "@phosphor-icons/react";
import { SRC_COLORS, CAT_COLORS, timeAgo, HERO_IMG } from "../constants";

export default function HeroStory({ article }) {
  if (!article) return null;
  const sc = SRC_COLORS[article.source] || "#0A0A0A";
  const cc = CAT_COLORS[article.category] || "#0A0A0A";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative border-b border-ink"
      data-testid="hero-top-story"
    >
      {/* Mono badge row */}
      <div className="flex items-center gap-2 px-5 pt-4 font-mono text-[10px] uppercase tracking-[0.18em]">
        <span className="inline-block w-2 h-2 rounded-full bg-signal animate-pulse" />
        <span className="text-signal font-bold">TOP STORY</span>
        <span className="text-faint">·</span>
        <span className="text-ink font-semibold">{article.source}</span>
        <span className="ml-auto text-faint">{timeAgo(article.published)}</span>
      </div>

      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-5 pb-5 pt-3 tactile"
        data-testid="hero-top-story-link"
      >
        <div className="relative w-full overflow-hidden border border-ink">
          <img
            src={HERO_IMG}
            alt="AI top story"
            loading="lazy"
            className="w-full h-[200px] object-cover grayscale contrast-110"
          />
          <div className="absolute top-2 left-2 font-mono text-[9px] tracking-[0.18em] uppercase bg-ink text-paper px-2 py-1">
            {article.category}
          </div>
          <div className="absolute bottom-2 right-2 font-mono text-[9px] tracking-[0.18em] uppercase bg-paper text-ink px-2 py-1 border border-ink">
            01 / TODAY
          </div>
        </div>

        <h1 className="mt-4 font-heading font-black text-[30px] leading-[0.96] tracking-[-0.02em] text-ink">
          {article.title}
        </h1>

        {article.summary ? (
          <p className="mt-3 text-[14px] leading-[1.55] text-muted line-clamp-3">{article.summary}</p>
        ) : null}

        <div className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-ink text-paper font-semibold">
            READ FULL <ArrowUpRight size={11} weight="bold" />
          </span>
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: cc }} />
          <span className="text-muted">{article.category}</span>
          <span className="ml-auto inline-flex items-center gap-1 text-faint">
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: sc }} />
            {article.source}
          </span>
        </div>
      </a>
    </motion.section>
  );
}
