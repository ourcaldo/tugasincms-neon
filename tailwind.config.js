/**
 * @deprecated This file is a legacy Tailwind CSS v3 config.
 * The project uses Tailwind CSS v4 with @tailwindcss/postcss and
 * CSS-first configuration via @import "tailwindcss" in globals.css.
 * This file is NOT used by the build but kept for reference.
 * @type {import('tailwindcss').Config}
 */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  darkMode: 'class',
}
