/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // FFXIV role colors
        tank:   '#4a9eff',
        healer: '#57c875',
        dps:    '#ff6b6b',
        // UI chrome
        surface:  '#1a1a2e',
        panel:    '#16213e',
        border:   '#0f3460',
        accent:   '#e94560',
      },
    },
  },
  plugins: [],
}
