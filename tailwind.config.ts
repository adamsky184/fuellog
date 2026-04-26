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
        // v2.11.0 — accent is driven by a CSS custom property so the user's
        // accent-picker (lib/theme.ts) propagates everywhere.
        //
        // The variable holds an RGB *triplet* ("14 165 233") rather than a
        // hex string so Tailwind's alpha-modifier syntax — `bg-accent/30`,
        // `ring-accent/30`, etc. — keeps working. Hex would break alpha.
        // Default triplet is set in globals.css.
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
        "accent-hover": "rgb(var(--accent-hover-rgb) / <alpha-value>)",
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
