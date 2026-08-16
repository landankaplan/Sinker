/** @type {import('tailwindcss').Config} */
module.exports = {
  // Class-based (not media-query-based) dark mode: a `dark` class on <html>
  // toggles every `dark:` variant. Driven by components/ThemeToggle.js +
  // the inline anti-flash script in app/layout.js, not the OS setting
  // alone - see that script's comment for why.
  darkMode: "class",
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
          // Dark-mode-only steps, named on the same `ink` (warm brown/black)
          // ramp rather than introducing a separate gray scale, so dark
          // mode still reads as "the same app, inverted" rather than a
          // generic gray dashboard bolted on. 300 = muted text on dark
          // surfaces, 800 = borders/subtle-fill on dark surfaces, 900 =
          // card surfaces, 950 = page background.
          300: "#a89a8c",
          800: "#3a322c",
          900: "#241f1b",
          950: "#18140f",
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
