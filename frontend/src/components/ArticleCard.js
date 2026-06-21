import React from "react";
import { motion } from "framer-motion";
import { BookmarkSimple, ArrowUpRight } from "@phosphor-icons/react";
import { SRC_COLORS, CAT_COLORS, timeAgo } from "../constants";

/** Rough reading-time estimate from the summary length. */
function readTime(text) {
  const w = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(w / 220));
}

export default function ArticleCard({
  article,
  index,
  saved,
  onToggleSave,
  testIdPrefix = "article-card",
  rank,
}) {
  const sc = SRC_COLORS[article.source] || "#525252";
  const cc = CAT_COLORS[article.category] || "#525252";
  const isSaved = saved.includes(article.id);
  const mins = readTime(article.summary || article.title);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="group relative border-b border-bone bg-paper hover:bg-bone/40 transition-colors"
      data-testid={`${testIdPrefix}-${index}`}
    >
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-5 py-5 tactile"
        data-testid={`${testIdPrefix}-${index}-link`}
      >
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          {rank != null && (
            <span className="inline-flex items-center justify-center text-ink font-bold text-[11px] mr-1">
              {String(rank).padStart(2, "0")}
            </span>
          )}
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: sc }} />
          <span className="text-ink font-semibold truncate">{article.source}</span>
          <span className="text-faint">/</span>
          <span style={{ color: cc }} className="font-semibold">{article.category}</span>
          <span className="ml-auto text-faint">{timeAgo(article.published)}</span>
        </div>

        <h3 className="mt-2 font-heading font-extrabold text-[19px] leading-[1.18] tracking-[-0.01em] text-ink line-clamp-3 group-hover:underline decoration-2 underline-offset-2 decoration-ink/30">
          {article.title}
        </h3>

        {article.summary ? (
          <p className="mt-2 text-[13.5px] leading-[1.55] text-muted line-clamp-2">{article.summary}</p>
        ) : null}

        <div className="mt-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em]">
          <span className="inline-flex items-center gap-1 text-klein font-semibold">
            READ <ArrowUpRight size={11} weight="bold" />
          </span>
          <span className="text-faint">·</span>
          <span className="text-faint">{mins} MIN</span>
          <motion.span
            className="ml-auto h-px bg-bone group-hover:bg-ink"
            initial={{ width: "20%" }}
            whileHover={{ width: "100%" }}
            transition={{ duration: 0.3 }}
            style={{ flex: 1 }}
          />
        </div>
      </a>

      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleSave(article.id);
        }}
        aria-label={isSaved ? "Unsave article" : "Save article"}
        className="absolute top-4 right-4 p-2 -m-2"
        data-testid={`${testIdPrefix}-${index}-save`}
      >
        <motion.span
          animate={{ scale: isSaved ? [1, 1.3, 1] : 1 }}
          transition={{ duration: 0.3 }}
          className="inline-block"
        >
          <BookmarkSimple
            size={18}
            weight={isSaved ? "fill" : "regular"}
            className={isSaved ? "text-klein" : "text-faint hover:text-ink"}
          />
        </motion.span>
      </motion.button>
    </motion.article>
  );
}
