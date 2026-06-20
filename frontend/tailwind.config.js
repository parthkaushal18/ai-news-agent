module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["'Cabinet Grotesk'", "'Inter Tight'", "sans-serif"],
        body: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        ink: "#0A0A0A",
        paper: "#F4F4F0",
        bone: "#E5E5E0",
        muted: "#525252",
        faint: "#8C8C8C",
        klein: "#0000FF",
        signal: "#FF3B30",
        amber: "#FFCC00",
      },
      animation: {
        "pulse-slow": "pulse 2s ease-in-out infinite",
        marquee: "marquee 30s linear infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};
