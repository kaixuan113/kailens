/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#24231f',
        paper: '#f5f2ec',
        olive: '#5f6548',
        rust: '#98563f',
        fog: '#ddd7cc',
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        serif: ['Iowan Old Style', 'Noto Serif SC', 'Songti SC', 'serif'],
      },
    },
  },
  plugins: [],
};
