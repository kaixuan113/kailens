/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#24231f',
        paper: '#f3f0e9',
        olive: '#5f6548',
        rust: '#a04f35',
        fog: '#d9d4c8',
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        serif: ['Iowan Old Style', 'Noto Serif SC', 'Songti SC', 'serif'],
      },
    },
  },
  plugins: [],
};
