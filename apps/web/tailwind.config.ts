import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Bauhaus Color Palette
        primary: {
          DEFAULT: "#ffd900", // Bauhaus Yellow
          400: "#ffd900",
          500: "#ffd900",
          600: "#e6c400",
          700: "#ccaf00",
        },
        "bauhaus-blue": {
          DEFAULT: "#1e40af",
          500: "#1e40af",
          600: "#1e3a8a",
          700: "#1e3a8a",
        },
        "bauhaus-red": {
          DEFAULT: "#dc2626",
          500: "#dc2626",
          600: "#d72638",
          700: "#991b1b",
        },
        "background-dark": "#121212",
        "surface-dark": "#1e1e1e",
        "surface-light": "#2a2614",
        accent: {
          DEFAULT: "#dc2626",
          400: "#dc2626",
          500: "#dc2626",
          600: "#d72638",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Space Grotesk", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
        body: ["Space Grotesk", "sans-serif"],
        mono: ["Space Grotesk", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0px", // Bauhaus sharp edges
        none: "0px",
        sm: "2px",
        md: "4px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        "3xl": "0px",
        full: "9999px", // For circles only
      },
      animation: {
        "spin-slow": "spin 12s linear infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "bauhaus-grid": "radial-gradient(#333 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "20px 20px",
      },
    },
  },
  plugins: [],
};
export default config;
