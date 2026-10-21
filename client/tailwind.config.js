/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f9f4',
          100: '#dfeee1',
          500: '#2e7d32',
          600: '#236a2d',
          700: '#1b4f2a',
          900: '#163d22',
        },
        earth: {
          50: '#f7f3eb',
          100: '#efe7d6',
          500: '#b67d3c',
        },
      },
      boxShadow: {
        soft: '0 18px 45px -18px rgba(32, 58, 38, 0.25)',
      },
    },
  },
  plugins: [],
};
