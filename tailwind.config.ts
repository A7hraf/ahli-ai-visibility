import type { Config } from "tailwindcss";

// "Muscat night & sand": midnight blue, Ahli gold, warm sand surfaces
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0E2235", 900: "#08172A", 800: "#0E2235", 700: "#173452" },
        brand: { DEFAULT: "#0B6298", 50: "#E8F2F9", 100: "#D2E5F2", 300: "#7FB2D9", 500: "#0B6298", 600: "#09547F" },
        gold: { DEFAULT: "#C9A227", 50: "#FBF5DF", 100: "#F4E7B5", 400: "#E2C35A", 600: "#A6841A", 700: "#7D6312" },
        ink: { DEFAULT: "#13263A", 2: "#3A4A5C", 900: "#0A1726", muted: "#66717E", soft: "#98A1AB" },
        canvas: "#F4EEE3",
        paper: "#FBF8F2",
        line: "#E7DECE",
        turq: { DEFAULT: "#0F9F94", 50: "#E2F5F2" },
        coral: { DEFAULT: "#EB5E3A", 50: "#FDEBE5" },
        violet: { DEFAULT: "#7A4FE0", 50: "#F0EAFD" },
        sky: { DEFAULT: "#1F86E0", 50: "#E6F1FC" },
        // warm greys instead of cold slate, so every surface sits on sand
        slate: { 50: "#FAF7F1", 100: "#F1EBE0", 200: "#E5DDCE", 300: "#D3C8B5", 400: "#B3A894", 500: "#8C8371" },
        good: { DEFAULT: "#1D7A47", soft: "#E1F2E7" },
        warn: { DEFAULT: "#9A6400", soft: "#FBEFD6" },
        bad: { DEFAULT: "#B8322A", soft: "#F9E2DE" },
      },
      fontFamily: {
        display: ["Reem Kufi", "Readex Pro", "system-ui", "sans-serif"],
        sans: ["Readex Pro", "system-ui", "sans-serif"],
        arabic: ["Readex Pro", "Tahoma", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(19,38,58,0.04), 0 6px 24px -8px rgba(92,72,32,0.14)",
        pop: "0 14px 40px -10px rgba(10,23,38,0.35)",
        glow: "0 0 0 4px rgba(201,162,39,0.25), 0 8px 24px -6px rgba(201,162,39,0.6)",
      },
      borderRadius: {
        "4xl": "28px",
      },
    },
  },
  plugins: [],
};
export default config;
