/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // "Warm Coral" direction - custom colors matching the validated
        // style-comparison mockup exactly (rather than approximating with
        // stock Tailwind hues). Status colors (amber/red/green) stay on
        // Tailwind's stock palette throughout the app - already close to
        // the accessibility-validated reference values and already used
        // consistently everywhere, so left alone to minimize risk.
        cream: {
          50: "#fdf9f5",
          100: "#f1e5da",
        },
        ink: {
          DEFAULT: "#2b2420",
          muted: "#6b5f54",
        },
        coral: {
          50: "#fef1ea",
          500: "#eb6834",
          600: "#d95926",
          700: "#c65a2a",
        },
      },
    },
  },
  plugins: [],
};
