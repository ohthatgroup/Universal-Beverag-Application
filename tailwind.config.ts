import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        status: {
          draft: {
            DEFAULT: "hsl(var(--status-draft))",
            bg: "hsl(var(--status-draft-bg))",
          },
          submitted: {
            DEFAULT: "hsl(var(--status-submitted))",
            bg: "hsl(var(--status-submitted-bg))",
          },
          delivered: {
            DEFAULT: "hsl(var(--status-delivered))",
            bg: "hsl(var(--status-delivered-bg))",
          },
          cancelled: {
            DEFAULT: "hsl(var(--status-cancelled))",
            bg: "hsl(var(--status-cancelled-bg))",
          },
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
      },
      fontSize: {
        "display-lg": ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "600" }],
        display: ["2rem", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "600" }],
        h1: ["1.5rem", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "600" }],
        h2: ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["1rem", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["0.9375rem", { lineHeight: "1.5" }],
      },
      boxShadow: {
        sm: "0 1px 2px 0 hsl(214 30% 12% / 0.05)",
        DEFAULT: "0 2px 6px -1px hsl(214 30% 12% / 0.06)",
        md: "0 4px 12px -2px hsl(214 30% 12% / 0.08)",
        lg: "0 12px 32px -8px hsl(214 30% 12% / 0.12)",
      },
      screens: {
        xs: "390px",
      },
      maxWidth: {
        mobile: "430px",
      },
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
