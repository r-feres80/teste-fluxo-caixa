/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: "#6B2BD9",
          blue: "#2D7FE0",
          cyan: "#2EDFEA",
          indigo: "#241B4E",
          lilac: "#C4B5FD",
          // aliases antigos (manter para não quebrar componentes existentes)
          "violet-deep": "#6B2BD9",
          violet: "#8B5CF6",
        },
        vel: {
          bg: "var(--vel-bg)",
          surface: "var(--vel-surface)",
          "surface-alt": "var(--vel-surface-alt)",
          border: "var(--vel-border)",
          "border-light": "var(--vel-border-light)",
          text: "var(--vel-text)",
          "text-sub": "var(--vel-text-sub)",
          "text-muted": "var(--vel-text-muted)",
          accent: "var(--vel-accent)",
          "accent-hover": "var(--vel-accent-hover)",
        },
      },
    },
  },
  plugins: [],
};
