/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          DEFAULT: "#FF9933",
          light: "#FFAA4D",
          dark: "#E67E17",
        },
        indiaGreen: {
          DEFAULT: "#138808",
          light: "#1DB90B",
          dark: "#0F6E06",
        },
        navy: "#000080",
        surface: {
          DEFAULT: "#0a0a0f",
          card: "rgba(255, 255, 255, 0.04)",
          border: "rgba(255, 255, 255, 0.08)",
        },
      },
      fontFamily: {
        sans: ["'Segoe UI'", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
