/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'off-white': '#faf9f6',
        'soft-green': '#a8d5ba',
        'soft-orange': '#fbc490',
      }
    },
  },
  plugins: [],
}
