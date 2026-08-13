/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          indigo: "#241B4E",
          "violet-deep": "#7C3AED",
          violet: "#8B5CF6",
          cyan: "#22D3EE",
          lilac: "#C4B5FD",
        },
      },
    },
  },
  plugins: [],
};
