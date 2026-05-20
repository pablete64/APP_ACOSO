import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

// Preset compartido entre apps/web y apps/landing
// Importar en tailwind.config.ts con: presets: [safeworkPreset]

const safeworkPreset: Config = {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        // --- Paleta principal SafeWork AI ---
        brand: {
          50:  "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d6fe",
          300: "#a5b8fc",
          400: "#8091f8",
          500: "#6366f1", // Primary — confianza, tecnología
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        // --- Verde confianza / seguridad ---
        trust: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e", // Confirmaciones, estado seguro
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        // --- Naranja alerta / advertencia ---
        alert: {
          50:  "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316", // Plazos próximos, advertencias
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        // --- Rojo peligro / urgente ---
        danger: {
          50:  "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444", // Errores, plazos vencidos, urgente
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
        },
        // --- Neutros cálidos (no fríos) para no intimidar ---
        neutral: {
          50:  "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
          950: "#0c0a09",
        },
        // --- Variables semánticas de shadcn/ui ---
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border:  "hsl(var(--border))",
        input:   "hsl(var(--input))",
        ring:    "hsl(var(--ring))",
      },

      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
        mono: ["JetBrains Mono", ...fontFamily.mono],
      },

      fontSize: {
        // Escala tipográfica accesible
        "2xs": ["0.625rem",  { lineHeight: "0.875rem" }],
        xs:    ["0.75rem",   { lineHeight: "1rem" }],
        sm:    ["0.875rem",  { lineHeight: "1.25rem" }],
        base:  ["1rem",      { lineHeight: "1.5rem" }],
        lg:    ["1.125rem",  { lineHeight: "1.75rem" }],
        xl:    ["1.25rem",   { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem",    { lineHeight: "2rem" }],
        "3xl": ["1.875rem",  { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem",   { lineHeight: "2.5rem" }],
        "5xl": ["3rem",      { lineHeight: "1.2" }],
        "6xl": ["3.75rem",   { lineHeight: "1.1" }],
      },

      borderRadius: {
        lg:   "var(--radius)",
        md:   "calc(var(--radius) - 2px)",
        sm:   "calc(var(--radius) - 4px)",
        xl:   "calc(var(--radius) + 4px)",
        "2xl":"calc(var(--radius) + 8px)",
      },

      spacing: {
        // Espaciado extra para componentes de formulario grandes (accesibilidad táctil)
        "tap": "2.75rem", // mínimo recomendado para targets táctiles (44px)
      },

      boxShadow: {
        "safework-sm": "0 1px 2px 0 rgb(99 102 241 / 0.05)",
        "safework":    "0 4px 6px -1px rgb(99 102 241 / 0.1), 0 2px 4px -2px rgb(99 102 241 / 0.1)",
        "safework-lg": "0 10px 15px -3px rgb(99 102 241 / 0.1), 0 4px 6px -4px rgb(99 102 241 / 0.1)",
        "trust":       "0 0 0 3px rgb(34 197 94 / 0.15)",
        "danger":      "0 0 0 3px rgb(239 68 68 / 0.15)",
        "alert":       "0 0 0 3px rgb(249 115 22 / 0.15)",
      },

      animation: {
        "fade-in":      "fadeIn 0.4s ease-out",
        "fade-up":      "fadeUp 0.4s ease-out",
        "slide-in-right": "slideInRight 0.35s ease-out",
        "slide-in-left":  "slideInLeft 0.35s ease-out",
        "pulse-trust":  "pulseTrust 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow":    "spin 3s linear infinite",
      },

      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%":   { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%":   { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseTrust: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.6" },
        },
      },

      transitionTimingFunction: {
        "safework": "cubic-bezier(0.4, 0, 0.2, 1)",
        "bounce-in": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },

      screens: {
        xs: "375px",  // móviles pequeños
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
  ],
};

export default safeworkPreset;
