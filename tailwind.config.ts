import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // v2.11.0 — accent is now driven by a CSS custom property so the
        // user's accent-picker preference (lib/theme.ts) takes effect on
        // every utility (bg-accent / text-accent / border-accent / ring).
        // Default value is set in globals.css.
        accent: "var(--accent, #0ea5e9)",
        "accent-hover": "var(--accent-hover, #0284c7)",
        ink: "#0f172a",
        paper: "#f8fafc",
        // Dark mode surfaces — tuned once here so utility usage stays readable.
        "ink-dark": "#e2e8f0",
        "paper-dark": "#0b1120",
        "card-dark": "#0f172a",
      },
    },
  },
  plugins: [],
};

export default config;
