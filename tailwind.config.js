/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          orange: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          dark: 'var(--color-primary-dark)',
        },
        background: {
          base: 'var(--color-bg-base)',
          cream: 'var(--color-bg-cream)',
          hover: 'var(--color-bg-hover)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      spacing: {
        'page': {
          'desktop': '48px',
          'tablet': '32px',
          'mobile': '20px',
        }
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'avatar': '50%',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06)',
        'hover': '0 4px 12px rgba(0,0,0,0.1)',
      },
      transitionDuration: {
        'DEFAULT': '200ms',
      },
      transitionTimingFunction: {
        'DEFAULT': 'ease-in-out',
      }
    },
  },
  plugins: [],
}
