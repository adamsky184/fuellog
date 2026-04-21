import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Simple palette, no CSS vars to keep it lean
        accent: "#0ea5e9",
        ink: "#0f172a",
        paper: "#f8fafc",
      },
    },
  },
  plugins: [],
};

export default config;
