/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef4ef",
          100: "#dbe7dd",
          200: "#bdd1c2",
          300: "#98b39f",
          400: "#71917c",
          500: "#587662",
          600: "#44604f",
          700: "#394f42",
          800: "#304137",
          900: "#28362e",
        },
        surface: "#f5f3ee",
        card: "#fcfbf8",
        muted: "#6e736c",
        border: "#ded9cf",
        ink: "#1f241f",
        danger: "#c85a52",
        warning: "#b98942",
        info: "#58718c",
      },
      fontFamily: {
        sans: ["DMSans-Regular"],
        heading: ["DMSans-Bold"],
        menu: ["DMSans-Medium"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
    },
  },
  plugins: [],
};
