/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          indigo: "#1E3A8A",          /* navy-900 — dark text / títulos     */
          "violet-deep": "#1D4ED8",   /* blue-700 — light primary           */
          violet: "#0EA5E9",          /* sky-500  — light accent            */
          cyan: "#22D3EE",            /* cyan-400 — dark accent (inalterado) */
          lilac: "#DBEAFE",           /* blue-100 — light tint              */
        },
      },
    },
  },
  plugins: [],
};
