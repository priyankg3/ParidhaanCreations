/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./app/**/*.{js,jsx}",
    "./src/**/*.{js,jsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: {
          DEFAULT: "#FDFBF7",
          paper: "#F5F2EB"
        },
        foreground: "hsl(var(--foreground))",
        /* Part 4 preview — premium palette swap.
           Previous (navy + dark red) felt generic-corporate; the new
           maroon + terracotta pairs better with the warm ivory background,
           the existing gold secondary, and the spiritual/handicrafts
           brand language (Vrindavan, Barsana, Laddu Gopal). */
        primary: {
          DEFAULT: "#6E0F2C", /* was #0F4C75 — deep maroon anchors the brand */
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#D4AF37", /* gold — kept, pairs beautifully with maroon */
          foreground: "#6E0F2C",
        },
        accent: {
          DEFAULT: "#A64A2A", /* was #800000 — terracotta for warmth on highlights */
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "#E2E8F0",
          foreground: "#64748B",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        heading: ['Cormorant Garamond', 'serif'],
        body: ['Manrope', 'sans-serif'],
        accent: ['Playfair Display', 'serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}