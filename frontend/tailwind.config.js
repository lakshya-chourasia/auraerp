/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#b3c7ff',
          400: '#85a3ff',
          500: '#4d70ff',
          600: '#2643ff',
          700: '#1429e6',
          800: '#0e1eb8',
          900: '#0e1a94',
        }
      }
    },
  },
  plugins: [],
}
