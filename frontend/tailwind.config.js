/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'binance-yellow': '#F0B90B',
        'binance-dark': '#1E2026',
        'binance-darker': '#0B0E11',
        'binance-gray': '#2A2D35',
        'binance-light-gray': '#474A57',
        'success-green': '#0ECB81',
        'error-red': '#F6465D',
        'warning-orange': '#F7931A'
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
