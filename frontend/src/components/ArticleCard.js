import React from "react";
import { motion } from "framer-motion";
import { BookmarkSimple, ArrowUpRight } from "@phosphor-icons/react";
import { SRC_COLORS, CAT_COLORS, timeAgo } from "../constants";

export default function ArticleCard({ article, index, saved, onToggleSave, testIdPrefix = "article-card" }) {
  const sc = SRC_COLORS[article.source] || "#525252";
  const cc = CAT_COLORS[article.category] || "#525252";
  const isSaved = saved.includes(article.id);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
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
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: sc }} />
          <span className="text-ink font-semibold truncate">{article.source}</span>
          <span className="text-faint">/</span>
          <span style={{ color: cc }} className="font-semibold">{article.category}</span>
          <span className="ml-auto text-faint">{timeAgo(article.published)}</span>
        </div>

        <h3 className="mt-2 font-heading font-extrabold text-[19px] leading-[1.18] tracking-tight text-ink line-clamp-3">
          {article.title}
        </h3>

        {article.summary ? (
          <p className="mt-2 text-[13.5px] leading-[1.55] text-muted line-clamp-2">{article.summary}</p>
        ) : null}

        <div className="mt-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em] text-faint">
          <span className="inline-flex items-center gap-1 text-klein font-semibold">
            READ <ArrowUpRight size={11} weight="bold" />
          </span>
          <span className="ml-auto h-px flex-1 bg-bone group-hover:bg-ink transition-colors" />
        </div>
      </a>

      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleSave(article.id);
        }}
        aria-label={isSaved ? "Unsave article" : "Save article"}
        className="absolute top-4 right-4 p-2 -m-2 tactile"
        data-testid={`${testIdPrefix}-${index}-save`}
      >
        <BookmarkSimple
          size={18}
          weight={isSaved ? "fill" : "regular"}
          className={isSaved ? "text-klein" : "text-faint hover:text-ink"}
        />
      </button>
    </motion.article>
  );
}
