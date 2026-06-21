import React, { useEffect, useState } from "react";

/**
 * Animated number counter — eases from previous value to new value over ~700ms.
 * Used in the stats strip so the numbers tick up like a flip board.
 */
export default function Counter({ value = 0, duration = 700, className = "" }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const start = display;
    const end = Number(value) || 0;
    if (start === end) return;
    const t0 = performance.now();
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(start + (end - start) * eased);
      setDisplay(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className}>{display}</span>;
}
