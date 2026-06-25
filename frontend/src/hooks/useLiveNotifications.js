import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useLiveNotifications
 *
 * - Tracks browser Notification permission state.
 * - Detects newly added articles between two fetches.
 * - When permission is granted, fires a browser Notification for up to
 *   `max` new articles (most recent first) per refresh tick.
 * - Returns the list of unseen article IDs and helpers to mark them seen.
 *
 * On the FIRST fetch all article IDs are marked as already-seen so we never
 * fire "everything is new" notifications on cold start.
 */
export default function useLiveNotifications(articles, opts = {}) {
  const { max = 3, enabled = false } = opts;

  const seen = useRef(new Set());
  const isFirstFetch = useRef(true);
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [unseenIds, setUnseenIds] = useState([]);

  // Sync permission state if it changes externally
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    const id = setInterval(() => {
      if (Notification.permission !== permission) {
        setPermission(Notification.permission);
      }
    }, 1500);
    return () => clearInterval(id);
  }, [permission]);

  // Diff articles against seen Set on every render where the list changes
  useEffect(() => {
    if (!articles || articles.length === 0) return;
    if (isFirstFetch.current) {
      articles.forEach((a) => seen.current.add(a.id));
      isFirstFetch.current = false;
      return;
    }

    const fresh = articles.filter((a) => a.id && !seen.current.has(a.id));
    if (fresh.length === 0) return;

    setUnseenIds((prev) => {
      const ids = new Set(prev);
      fresh.forEach((a) => ids.add(a.id));
      return Array.from(ids);
    });

    if (
      enabled &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      document.visibilityState === "hidden"
    ) {
      // Only fire native notifications when the tab is in the background.
      // When the tab is foreground, the in-app toast is enough.
      const top = fresh.slice(0, max);
      top.forEach((a, i) => {
        setTimeout(() => {
          try {
            new Notification(`Breaking · ${a.source}`, {
              body: a.title,
              icon: "/favicon.ico",
              tag: a.id,
              silent: i > 0,
            });
          } catch {
            /* notifications can throw on Safari */
          }
        }, i * 250);
      });
    }

    // Mark all as seen so we don't spam on the next tick.
    fresh.forEach((a) => seen.current.add(a.id));
  }, [articles, enabled, max]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "unsupported";
    const r = await Notification.requestPermission();
    setPermission(r);
    return r;
  }, []);

  const dismissAll = useCallback(() => setUnseenIds([]), []);

  return { permission, requestPermission, unseenIds, dismissAll };
}
