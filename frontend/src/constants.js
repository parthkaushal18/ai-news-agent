// Source & category color tokens — picked to feel editorial, not generic neon
export const SRC_COLORS = {
  "VentureBeat AI": "#0000FF",
  "TechCrunch AI": "#00875A",
  "The Decoder": "#5B21B6",
  "AI News": "#EA580C",
  "HuggingFace Blog": "#CA8A04",
  "Google DeepMind": "#0891B2",
  "MIT Tech Review": "#DC2626",
  "Ars Technica": "#B45309",
  "The Gradient": "#BE185D",
  "Import AI": "#0F766E",
  "Hacker News": "#FB923C",
  "arXiv": "#1F2937",
};

export const CAT_COLORS = {
  Industry: "#0000FF",
  Research: "#5B21B6",
  "Research Paper": "#1F2937",
  Community: "#FB923C",
  Newsletter: "#0F766E",
};

export const TABS = [
  { id: "feed", label: "Feed" },
  { id: "trending", label: "Trending" },
  { id: "search", label: "Search" },
  { id: "saved", label: "Saved" },
];

// Hero image (used in the splash / top-story image area). Editorial, high-contrast.
export const HERO_IMG =
  "https://images.unsplash.com/photo-1737644467636-6b0053476bb2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwzfHxhaSUyMHJvYm90aWNzJTIwdGVjaG5vbG9neXxlbnwwfHx8fDE3ODE5ODI3NDZ8MA&ixlib=rb-4.1.0&q=85";

export function timeAgo(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m";
    if (diff < 86400) return Math.floor(diff / 3600) + "h";
    if (diff < 604800) return Math.floor(diff / 86400) + "d";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function formatCountdown(secs) {
  const s = Math.max(0, Math.floor(secs || 0));
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
}
