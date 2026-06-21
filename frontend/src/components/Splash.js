import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "./Logo";

/**
 * Splash / boot screen — appears for ~1.7s on first mount.
 * Plays an editorial "system boot" animation: logo reveal, terminal ticker,
 * progress bar, then collapses upward to reveal the app shell.
 */
const BOOT_LINES = [
  "POWER ON   ::  OK",
  "AGENT INIT ::  OK",
  "FEED SYNC  ::  CONNECTED",
  "12 SOURCES ::  ONLINE",
];

export default function Splash({ onDone }) {
  const [show, setShow] = useState(true);
  const onDoneRef = React.useRef(onDone);
  React.useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1900);
    const d = setTimeout(() => onDoneRef.current?.(), 2300);
    return () => {
      clearTimeout(t);
      clearTimeout(d);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.45, ease: [0.7, 0, 0.3, 1] }}
          className="absolute inset-0 z-50 bg-ink text-paper flex flex-col grain"
          data-testid="splash-screen"
        >
          {/* mono header */}
          <div className="flex items-center justify-between px-5 pt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/60">
            <span>SYNAPSE / OS</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
              BOOTING
            </span>
          </div>

          {/* center logo + brand */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Logo size={96} animate />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
              className="mt-7 font-heading font-black text-paper text-[40px] tracking-[-0.04em] leading-none"
            >
              SYN<span className="text-klein">·</span>APSE
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="mt-3 font-mono text-[10px] tracking-[0.32em] uppercase text-paper/70"
            >
              AI NEWS TERMINAL · v1.0
            </motion.p>

            {/* progress bar */}
            <div className="mt-10 w-48 h-[2px] bg-paper/15 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="h-full bg-klein"
              />
            </div>
          </div>

          {/* terminal log ticker */}
          <div className="px-5 pb-7 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45 space-y-1">
            {BOOT_LINES.map((line, i) => (
              <motion.div
                key={line}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.14, duration: 0.22 }}
                className="flex items-center gap-2"
              >
                <span className="text-klein">»</span>
                <span>{line}</span>
              </motion.div>
            ))}
          </div>

          {/* crosshatch decoration */}
          <div className="absolute top-3 right-3 w-10 h-10 crosshatch opacity-20 pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-10 h-10 crosshatch opacity-20 pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
