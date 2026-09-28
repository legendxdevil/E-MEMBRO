/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#17191c",
          black: "#17191c",
        },
        paper: {
          DEFAULT: "#ffffff",
          white: "#ffffff",
        },
        mist: {
          DEFAULT: "#f2f2f3",
          gray: "#f2f2f3",
        },
        fog: {
          DEFAULT: "#fafafb",
          white: "#fafafb",
        },
        slate: {
          gray: "#777b86",
        },
        ash: {
          gray: "#979799",
        },
        smoke: {
          gray: "#a3a6af",
        },
        peach: {
          DEFAULT: "#fbe1d1",
          blush: "#fbe1d1",
        },
        sienna: {
          DEFAULT: "#5d2a1a",
          brown: "#5d2a1a",
        },
        hairline: "#ececec",
      },
      fontFamily: {
        serif: ["Newsreader", "Source Serif 4", "Georgia", "serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        "3xl": "24px",
        "2xl-plus": "20px",
        "2xl": "16px",
        pill: "9999px",
      },
      boxShadow: {
        artifact: "0 0 0 1px rgba(4,23,43,0.05), 0 20px 25px -5px rgba(0,0,0,0.06), 0 8px 10px -6px rgba(0,0,0,0.06)",
        subtle: "0 0 0 1px rgba(4,23,43,0.04), 0 4px 16px 0 rgba(0,0,0,0.04)",
        popover: "0 0 0 1px rgba(4,23,43,0.05), 0 8px 30px rgba(0,0,0,0.08)",
      }
    },
  },
  plugins: [],
}
