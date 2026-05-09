/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Manrope', 'Segoe UI', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        bank: {
          base: "var(--bank-base)",
          panel: "var(--bank-panel)",
          "panel-soft": "var(--bank-panel-soft)",
          ink: "var(--bank-ink)",
          muted: "var(--bank-muted)",
          border: "var(--bank-border)",
          accent: "var(--bank-accent)",
          "accent-strong": "var(--bank-accent-strong)",
          cosmic: "var(--bank-cosmic)",
          "cosmic-soft": "var(--bank-cosmic-soft)",
        },
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "muted-foreground": "var(--muted-foreground)",
        foreground: "var(--foreground)",
        background: "var(--background)",
        card: "var(--card)",
        border: "var(--border)",
      },
      boxShadow: {
        "cosmic-card": "0 14px 30px -24px rgba(16, 32, 64, 0.28)",
        "cosmic-soft": "0 8px 18px -16px rgba(16, 32, 64, 0.24)",
      },
    },
  },
  plugins: [],
}
