import React, { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Lightning } from "@phosphor-icons/react";
import { SRC_COLORS, CAT_COLORS, timeAgo, HERO_IMG } from "../constants";

export default function HeroStory({ article, onOpen }) {
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReveal(true), 60);
    return () => clearTimeout(t);
  }, [article?.id]);

  const { scrollY } = useScroll();
  const imgY = useTransform(scrollY, [0, 400], [0, 40]);

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
      {/* mono breadcrumb */}
      <div className="flex items-center gap-2 px-5 pt-4 font-mono text-[10px] uppercase tracking-[0.18em]">
        <span className="inline-flex items-center gap-1.5 text-signal font-bold">
          <Lightning size={11} weight="fill" />
          TOP STORY
        </span>
        <span className="text-faint">·</span>
        <span className="text-ink font-semibold truncate">{article.source}</span>
        <span className="ml-auto text-faint">{timeAgo(article.published)}</span>
      </div>

      <button
        type="button"
        onClick={() => onOpen?.(article)}
        className="block w-full text-left px-5 pb-6 pt-3 tactile"
        data-testid="hero-top-story-link"
      >
        {/* image with parallax + animated reveal mask */}
        <div className="relative w-full overflow-hidden border border-ink h-[220px] bg-ink">
          <motion.img
            src={HERO_IMG}
            alt="AI top story"
            loading="lazy"
            style={{ y: imgY }}
            className="w-full h-full object-cover grayscale contrast-110"
          />
          {/* shutter reveal */}
          <motion.div
            initial={{ scaleY: 1 }}
            animate={{ scaleY: reveal ? 0 : 1 }}
            transition={{ duration: 0.7, ease: [0.7, 0, 0.3, 1] }}
            style={{ originY: 0 }}
            className="absolute inset-0 bg-paper"
          />
          {/* tickers on image */}
          <div className="absolute top-2 left-2 font-mono text-[9px] tracking-[0.18em] uppercase bg-ink text-paper px-2 py-1">
            {article.category}
          </div>
          <div className="absolute bottom-2 right-2 font-mono text-[9px] tracking-[0.18em] uppercase bg-paper text-ink px-2 py-1 border border-ink">
            ISS · 001
          </div>
          {/* signal dot */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-paper/95 px-2 py-1 border border-ink font-mono text-[9px] uppercase tracking-[0.18em]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
            LIVE
          </div>
          {/* scanline overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-10" style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent 0 2px, #000 2px 3px)"
          }} />
        </div>

        {/* big headline with character stagger */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-4 font-heading font-black text-[30px] leading-[0.96] tracking-[-0.025em] text-ink"
        >
          {article.title}
        </motion.h1>

        {article.summary ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="mt-3 text-[14px] leading-[1.55] text-muted line-clamp-3"
          >
            {article.summary}
          </motion.p>
        ) : null}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]"
        >
          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-ink text-paper font-semibold">
            READ FULL <ArrowUpRight size={11} weight="bold" />
          </span>
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: cc }} />
          <span className="text-muted">{article.category}</span>
          <span className="ml-auto inline-flex items-center gap-1 text-faint">
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: sc }} />
            {article.source}
          </span>
        </motion.div>
      </button>
    </motion.section>
  );
}
