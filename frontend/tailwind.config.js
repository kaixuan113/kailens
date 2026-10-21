/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#13243b",
        paper: "#ffffff",
        olive: "#2674dc",
        rust: "#2563eb",
        fog: "#eef4fc",
      },
      fontFamily: {
        sans: ["Inter", "PingFang SC", "Microsoft YaHei", "sans-serif"],
        serif: ["Inter", "PingFang SC", "Microsoft YaHei", "sans-serif"],
      },
    },
  },
  plugins: [],
};
