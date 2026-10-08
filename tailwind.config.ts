import type { Config } from "tailwindcss";

// Clean dashboard: neutral surfaces, Ahli navy and gold, one typeface (Tajawal)
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0B3A5B", 900: "#072A43", 800: "#0B3A5B", 700: "#134C74" },
        brand: { DEFAULT: "#0B6298", 50: "#E8F2F9", 100: "#D2E5F2", 300: "#7FB2D9", 500: "#0B6298", 600: "#09547F" },
        gold: { DEFAULT: "#C9A227", 50: "#FBF5DF", 100: "#F4E7B5", 400: "#E2C35A", 600: "#A6841A", 700: "#7D6312" },
        ink: { DEFAULT: "#101828", 2: "#344054", 900: "#0C111D", muted: "#667085", soft: "#98A2B3" },
        canvas: "#F5F6F8",
        paper: "#F9FAFB",
        line: "#E6E8EC",
        turq: { DEFAULT: "#0F9F94", 50: "#E2F5F2" },
        coral: { DEFAULT: "#EB5E3A", 50: "#FDEBE5" },
        violet: { DEFAULT: "#7A4FE0", 50: "#F0EAFD" },
        sky: { DEFAULT: "#1F86E0", 50: "#E6F1FC" },
        slate: { 50: "#F9FAFB", 100: "#F2F4F7", 200: "#E4E7EC", 300: "#D0D5DD", 400: "#98A2B3", 500: "#667085" },
        good: { DEFAULT: "#1D7A47", soft: "#E1F2E7" },
        warn: { DEFAULT: "#9A6400", soft: "#FBEFD6" },
        bad: { DEFAULT: "#B8322A", soft: "#F9E2DE" },
      },
      fontFamily: {
        display: ["Tajawal", "system-ui", "sans-serif"],
        sans: ["Tajawal", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        arabic: ["Tajawal", "Tahoma", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.05)",
        pop: "0 12px 28px -10px rgba(16,24,40,0.18)",
        glow: "0 1px 2px rgba(16,24,40,0.06)",
      },
      borderRadius: {
        "4xl": "16px",
      },
    },
  },
  plugins: [],
};
export default config;
