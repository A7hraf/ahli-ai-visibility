import type { Config } from "tailwindcss";

// "Sada" look: warm paper canvas, white cards with square corners, serif headings over a clean Arabic sans,
// Ahli navy for actions and gold for Ahli
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0B3A5B", 900: "#072640", 800: "#0B3A5B", 700: "#0A3150", 50: "#E6EEF4" },
        brand: { DEFAULT: "#0B3A5B", 50: "#E6EEF4", 100: "#C9D8E4", 300: "#7FA3BD", 500: "#0B3A5B", 600: "#0A3150" },
        gold: { DEFAULT: "#C9A227", 50: "#FBF4DE", 100: "#F3EEDD", 400: "#E9CF7A", 600: "#A8841A", 700: "#8A6D12" },
        ink: { DEFAULT: "#0F1B2D", 2: "#3B4A5E", 900: "#0F1B2D", muted: "#5A6270", soft: "#80858C" },
        canvas: "#F7F6F2",
        paper: "#FBFAF7",
        line: { DEFAULT: "#E5E2D9", 2: "#DAD6CB" },
        turq: { DEFAULT: "#1F6B3F", 50: "#E6F0E9" },
        coral: { DEFAULT: "#C2410C", 50: "#FFF4E5" },
        violet: { DEFAULT: "#4a3aa7", 50: "#EEEBFA" },
        sky: { DEFAULT: "#2a78d6", 50: "#EAF2FC" },
        slate: { 50: "#FBFAF7", 100: "#F2F0E9", 200: "#EFEDE6", 300: "#DAD6CB", 400: "#A3A7AD", 500: "#80858C" },
        good: { DEFAULT: "#1F6B3F", soft: "#E6F0E9" },
        warn: { DEFAULT: "#B45309", soft: "#FFF4E5" },
        bad: { DEFAULT: "#C1005F", soft: "#FFF1F6" },
      },
      fontFamily: {
        display: ["'Source Serif 4'", "'Noto Naskh Arabic'", "Georgia", "serif"],
        sans: ["'IBM Plex Sans Arabic'", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        arabic: ["'IBM Plex Sans Arabic'", "Tahoma", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(15,27,45,0.02)",
        pop: "0 14px 32px -16px rgba(15,27,45,0.28)",
        glow: "0 0 0 3px rgba(201,162,39,0.25)",
      },
      borderRadius: {
        md: "3px",
        lg: "4px",
        xl: "4px",
        "2xl": "4px",
        "3xl": "10px",
        "4xl": "4px",
      },
    },
  },
  plugins: [],
};
export default config;
