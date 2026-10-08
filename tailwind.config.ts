import type { Config } from "tailwindcss";

// Ahli Bank palette, sampled from the logo
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0B3A5B", 900: "#072A43", 800: "#0B3A5B", 700: "#134C74" },
        brand: { DEFAULT: "#0B6298", 50: "#EAF3FA", 100: "#D5E7F4", 300: "#7FB2D9", 500: "#0B6298", 600: "#09547F" },
        gold: { DEFAULT: "#ADA042", 50: "#F7F5E6", 100: "#EFEBC8", 400: "#CDBE5E", 600: "#8A7F2A", 700: "#6E6520" },
        ink: { DEFAULT: "#0B2540", 2: "#33475C", 900: "#0A1B2E", muted: "#5B6B7E", soft: "#8494A7" },
        canvas: "#F4F6F9",
        line: "#E3E8EE",
        good: { DEFAULT: "#1D7A47", soft: "#E3F4E9" },
        warn: { DEFAULT: "#9A6400", soft: "#FBF0D9" },
        bad: { DEFAULT: "#B23A2E", soft: "#F9E3E0" },
      },
      fontFamily: {
        display: ["IBM Plex Sans", "IBM Plex Sans Arabic", "system-ui", "sans-serif"],
        sans: ["IBM Plex Sans", "IBM Plex Sans Arabic", "system-ui", "sans-serif"],
        arabic: ["IBM Plex Sans Arabic", "Tahoma", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,37,64,0.04), 0 2px 10px rgba(11,37,64,0.04)",
        pop: "0 8px 28px rgba(10,27,46,0.22)",
      },
    },
  },
  plugins: [],
};
export default config;
