/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        spider: {
          950: '#07090E',
          900: '#0D111A',
          850: '#131826',
          800: '#1A2133',
          700: '#26314D',
          red: '#EF233C',
          redHover: '#D90429',
          redGlow: 'rgba(239, 35, 60, 0.4)',
          blue: '#00B4D8',
          blueGlow: 'rgba(0, 180, 216, 0.4)',
          gold: '#FFB703',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'spider-glow': '0 0 25px -5px rgba(239, 35, 60, 0.35)',
        'hero-glow': '0 0 25px -5px rgba(0, 180, 216, 0.35)',
      },
    },
  },
  plugins: [],
}
