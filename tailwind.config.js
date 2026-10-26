export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#F8F1E7', 2: '#F3E9DA' },
        marun: '#6B1F23',
        ink: '#111111',
        // gold = dekoratif/teks besar; gold-deep = teks kecil (kontras WCAG AA)
        gold: { DEFAULT: '#B07A3A', deep: '#8A5B22' },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        script: ['"Great Vibes"', 'cursive'],
      },
      boxShadow: { card: '0 6px 24px rgba(107,31,35,.10)' },
      borderRadius: { card: '18px' },
    },
  },
  plugins: [],
};