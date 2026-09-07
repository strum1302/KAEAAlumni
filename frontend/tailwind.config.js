/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 고려대학교 시그니처 크림슨 레드
        crimson: {
          DEFAULT: '#860038',
          50: '#fdf2f6',
          100: '#fbe6ef',
          600: '#a30045',
          700: '#860038',
          800: '#6c002d',
          900: '#520022',
        },
      },
    },
  },
  plugins: [],
}
