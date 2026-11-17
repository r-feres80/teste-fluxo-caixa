/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          indigo: "#022C22",          /* dark emerald (era indigo escuro) */
          "violet-deep": "#065F46",   /* emerald-800 — light primary       */
          violet: "#10B981",          /* emerald-500 — light accent         */
          cyan: "#22D3EE",            /* cyan-400    — dark accent (inalterado) */
          lilac: "#A7F3D0",           /* emerald-200 — light tint (era lilac) */
        },
      },
    },
  },
  plugins: [],
};
