/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: { hand: ['Caveat', 'cursive'] },
      colors: {
        brand: {
          orange: '#FF5722',
          'orange-hover': '#E64A19',
          'orange-light': '#FFF0EB',
          dark: '#0A0A0A',
          gray: '#64748B',
        },
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-soft': 'var(--accent-soft)',
        ink: 'var(--ink)',
      },
    },
  },
  plugins: [],
}
