import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#581c87",
          900: "#3b0764",
          950: "#240540",
        },
        brand: {
          blue: "#9333ea",
          light: "#ec4899",
          sky: "#f472b6",
          ice: "#fdf2f8",
        },
        plum: {
          50: "#fdf4ff",
          100: "#fae8ff",
          200: "#f5d0fe",
          300: "#f0abfc",
          400: "#e879f9",
          500: "#d946ef",
          600: "#c026d3",
          700: "#a21caf",
          800: "#701a75",
          900: "#4a044e",
        },
      },
      fontFamily: {
        sans: ["var(--font-sarabun)", "sans-serif"],
        display: ["var(--font-prompt)", "var(--font-sarabun)", "sans-serif"],
      },
      boxShadow: {
        glass: "0 10px 36px -10px rgba(126, 34, 206, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
        "glass-lg": "0 20px 50px -14px rgba(147, 51, 234, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.85)",
        "glass-pink": "0 12px 32px -8px rgba(236, 72, 153, 0.28)",
      },
    },
  },
  plugins: [],
};
export default config;
