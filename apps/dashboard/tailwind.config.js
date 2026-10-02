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
        background: {
          DEFAULT: "#090b10",
          secondary: "#0e131f",
          card: "#121826",
          elevated: "#182032",
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.07)",
          glow: "rgba(56, 189, 248, 0.25)",
        },
        cyber: {
          blue: "#38bdf8",
          indigo: "#6366f1",
          violet: "#a855f7",
          emerald: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e",
        },
        // Legacy compatibility
        ink: {
          DEFAULT: "#f1f5f9",
          black: "#090b10",
        },
        paper: {
          DEFAULT: "#121826",
          white: "#ffffff",
        },
        mist: {
          DEFAULT: "#182032",
          gray: "#1e293b",
        },
        fog: {
          DEFAULT: "#0e131f",
          white: "#0e131f",
        },
        slate: {
          gray: "#94a3b8",
        },
        ash: {
          gray: "#64748b",
        },
        smoke: {
          gray: "#475569",
        },
        peach: {
          DEFAULT: "rgba(245, 158, 11, 0.15)",
          blush: "#f59e0b",
        },
        sienna: {
          DEFAULT: "#fbbf24",
          brown: "#fbbf24",
        },
        hairline: "rgba(255, 255, 255, 0.08)",
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
        serif: ["Newsreader", "Source Serif 4", "Georgia", "serif"],
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(56, 189, 248, 0.25)",
        "glow-emerald": "0 0 25px -5px rgba(16, 185, 129, 0.3)",
        "glow-violet": "0 0 25px -5px rgba(168, 85, 247, 0.25)",
        artifact: "0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)",
        subtle: "0 4px 20px -4px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.06)",
        popover: "0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.12)",
      },
      animation: {
        "pulse-subtle": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "radar-sweep": "radar 4s linear infinite",
      },
      keyframes: {
        radar: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        }
      }
    },
  },
  plugins: [],
}
