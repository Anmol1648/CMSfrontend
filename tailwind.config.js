/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // "Academic Architect" - High-Density ERP Palette
        "surface-container": "#e5eeff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#eff4ff",
        "surface-container-high": "#dce9ff",
        "surface-container-highest": "#d3e4fe",
        
        "surface-lowest": "#ffffff",
        "surface-low": "#eff4ff",
        "surface-high": "#dce9ff",
        "surface-highest": "#d3e4fe",

        "surface-bright": "#f8f9ff",
        "surface-dim": "#cbdbf5",
        "surface-variant": "#d3e4fe",
        
        "on-surface": "#0b1c30",
        "on-surface-variant": "#43474e",
        
        primary: {
          DEFAULT: "#1A365D",
          container: "#002045",
          fixed: "#d6e3ff",
          "fixed-variant": "#2d476f",
        },
        
        secondary: {
          DEFAULT: "#555f70",
          container: "#d9e3f8",
          fixed: "#d9e3f8",
          "fixed-variant": "#3e4758",
        },

        tertiary: {
          DEFAULT: "#321b00",
          container: "#4f2e00",
          fixed: "#ffddba",
          "fixed-variant": "#633f0f",
        },

        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
        },
        
        outline: {
          DEFAULT: "#74777f",
          variant: "#e0e2ec",
        },

        background: "#f8f9ff",
        surface: "#f8f9ff",
      },
      fontFamily: {
        manrope: ["var(--font-manrope)", "sans-serif"],
        inter: ["var(--font-inter)", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["3.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "800" }],
        "headline-lg": ["2rem", { lineHeight: "1.2", fontWeight: "700" }],
        "body-lg": ["1rem", { lineHeight: "1.5", fontWeight: "400" }],
        "label-md": ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }],
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        md: "0.375rem",
        lg: "0.25rem",
        xl: "0.5rem",
        "2xl": "1rem",
        full: "9999px",
      },
      boxShadow: {
        ambient: "0 0 32px 0 rgba(26, 54, 93, 0.06)",
        premium: "0 10px 40px -10px rgba(26, 54, 93, 0.1)",
      },
      backgroundImage: {
        "primary-gradient": "linear-gradient(135deg, #002045 0%, #1a365d 100%)",
      },
      keyframes: {
        "fade-out": {
          "0%": { opacity: "1", visibility: "visible" },
          "100%": { opacity: "0", visibility: "hidden" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "zoom-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        }
      },
      animation: {
        "fade-out": "fade-out 0.8s ease-in-out forwards",
        "fade-in-up": "fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "zoom-in": "zoom-in 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }
    },
  },
  plugins: [],
};
