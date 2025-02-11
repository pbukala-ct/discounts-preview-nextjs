/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-10': 'var(--color-primary-10)',
        'primary-85': 'var(--color-primary-85)',
        'primary-95': 'var(--color-primary-95)',
        'primary-98': 'var(--color-primary-98)',
        surface: 'var(--color-surface)',
        neutral: 'var(--color-neutral)',
        'neutral-40': 'var(--color-neutral-40)',
        'neutral-60': 'var(--color-neutral-60)',
        'neutral-85': 'var(--color-neutral-85)',
        error: 'var(--color-error)',
        'error-25': 'var(--color-error-25)',
        'error-85': 'var(--color-error-85)',
        success: 'var(--color-success)',
        solid: 'var(--color-solid)'
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)'
      },
      borderRadius: {
        6: 'var(--border-radius-6)'
      }
    },
  },
  plugins: [],}