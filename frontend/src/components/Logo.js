import React from "react";
import { motion } from "framer-motion";

/**
 * SYNAPSE logo — a stylized "S" built from three offset bars whose connection
 * dots pulse like neural synapses. Vector-based so it scales perfectly.
 */
export default function Logo({ size = 40, withMark = true, animate = true }) {
  const w = size;
  const h = size;
  return (
    <svg
      viewBox="0 0 40 40"
      width={w}
      height={h}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="SYNAPSE"
      role="img"
    >
      {/* outer frame */}
      <rect x="0.5" y="0.5" width="39" height="39" rx="3" stroke="#0A0A0A" strokeWidth="1.4" fill="#0A0A0A" />

      {/* three horizontal bars forming a stylised S — top-right, middle-left, bottom-right */}
      <rect x="14" y="9" width="18" height="4" fill="#F4F4F0" />
      <rect x="8" y="18" width="18" height="4" fill="#F4F4F0" />
      <rect x="14" y="27" width="18" height="4" fill="#F4F4F0" />

      {/* synapse "spark" dots in Klein blue at the connection joints */}
      {animate ? (
        <>
          <motion.circle
            cx="14"
            cy="11"
            r="1.6"
            fill="#0000FF"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx="26"
            cy="20"
            r="1.6"
            fill="#0000FF"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          />
          <motion.circle
            cx="14"
            cy="29"
            r="1.6"
            fill="#0000FF"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          />
        </>
      ) : (
        <>
          <circle cx="14" cy="11" r="1.6" fill="#0000FF" />
          <circle cx="26" cy="20" r="1.6" fill="#0000FF" />
          <circle cx="14" cy="29" r="1.6" fill="#0000FF" />
        </>
      )}

      {/* signal red corner accent (live indicator) */}
      {withMark && <rect x="33" y="2" width="5" height="5" fill="#FF3B30" />}
    </svg>
  );
}
