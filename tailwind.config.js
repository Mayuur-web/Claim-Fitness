/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        text: "var(--text)",
        muted: "var(--muted)",
        mine: "var(--mine)",
        rival: "var(--rival)",
        path: "var(--path)",
        warn: "var(--warn)",
      },
      fontFamily: {
        sans: ["var(--font-sora)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: {
        panel: "24px",
        btn: "20px",
      },
      boxShadow: {
        glowMine: "0 0 24px -2px rgba(182, 255, 59, 0.45)",
        glowRival: "0 0 24px -2px rgba(255, 77, 141, 0.45)",
        glowPath: "0 0 20px -2px rgba(61, 225, 255, 0.55)",
      },
    },
  },
  plugins: [],
};

