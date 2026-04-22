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
        accent: "#0ea5e9",
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
