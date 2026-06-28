/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // All point to CSS custom properties so they update live
        surface:  'var(--color-surface)',
        panel:    'var(--color-panel)',
        border:   'var(--color-border)',
        accent:   'var(--color-accent)',
        tank:     'var(--color-tank)',
        healer:   'var(--color-healer)',
        dps:      'var(--color-dps)',
      },
    },
  },
  plugins: [],
}
