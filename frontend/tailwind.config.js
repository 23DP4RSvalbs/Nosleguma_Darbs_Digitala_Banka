/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "muted-foreground": "var(--muted-foreground)",
        foreground: "var(--foreground)",
        background: "var(--background)",
        card: "var(--card)",
        border: "var(--border)",
      },
    },
  },
  plugins: [],
}
