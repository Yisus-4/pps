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
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          dark: "var(--malva-dark)",
          light: "var(--malva-light)",
          subtle: "var(--malva-subtle)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          dark: "var(--gold-dark)",
          light: "var(--gold-light)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        // UNdeC Specific Named Palette
        malva: {
          DEFAULT: "#826170",
          dark: "#4F3A44",
          base: "#826170",
          medium: "#A98B99",
          light: "#D5C3CC",
          subtle: "#F1E9ED",
        },
        dorado: {
          DEFAULT: "#E5B115",
          dark: "#A07A0B",
          base: "#E5B115",
          light: "#F3DC94",
        },
        neutral: {
          page: "#FAF8F7",
          card: "#FFFFFF",
          border: "#E6E0DD",
          text: "#1F1A1C",
          secondary: "#6B6166",
          grid: "#EAE5E2",
        },
        status: {
          cumple: "#3F6B4F",
          observacion: "#A07A0B",
          nocumple: "#A33B2F",
        },
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
          6: "var(--chart-6)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
