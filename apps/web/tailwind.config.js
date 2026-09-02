/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F1FBFA',
          100: '#DDF5F2',
          300: '#7BD5CD',
          400: '#45BEB4',
          500: '#1AA398',
          600: '#13867C',
          700: '#0F6B63',
          800: '#0D514C',
          900: '#0A3D3A',
          950: '#062D2B',
        },
        navy: { 700: '#243B53', 900: '#102A43' },
      },
      boxShadow: { soft: '0 10px 30px rgba(16, 42, 67, 0.07)' },
      borderRadius: { card: '18px' },
    },
  },
  plugins: [],
};
