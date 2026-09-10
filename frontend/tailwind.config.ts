import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        console: {
          bg: "#05070d",
          panel: "#0b1120",
          line: "#1d2a44",
          cyan: "#67e8f9",
          amber: "#fbbf24",
          red: "#fb7185",
          green: "#34d399",
        },
      },
    },
  },
  plugins: [],
};

export default config;
