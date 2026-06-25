import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightning, X } from "@phosphor-icons/react";

/**
 * Live "X new stories" toast banner — sits below the stats strip when
 * unseen articles arrive in the background.
 */
export default function NewStoriesToast({ count, onTap, onDismiss }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          key="new-stories-toast"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          onClick={onTap}
          className="relative z-20 w-full px-5 py-2 bg-klein text-paper flex items-center gap-3 tactile"
          data-testid="new-stories-toast"
        >
          <span className="relative">
            <Lightning size={14} weight="fill" className="text-amber" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold">
            {count} NEW STOR{count === 1 ? "Y" : "IES"} ·
          </span>
          <span className="font-heading text-[13px] font-bold">Tap to view</span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              onDismiss?.();
            }}
            className="ml-auto p-1 -m-1 hover:opacity-70"
            data-testid="new-stories-dismiss"
            role="button"
            aria-label="Dismiss"
          >
            <X size={14} weight="bold" />
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
