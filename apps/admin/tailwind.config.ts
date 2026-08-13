import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          500: "#0f7dfa",
          600: "#0b63c9",
          700: "#0a4f9e",
        },
      },
    },
  },
  plugins: [],
};

export default config;
