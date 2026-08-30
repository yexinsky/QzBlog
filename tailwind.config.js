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
          orange: 'rgb(var(--color-primary) / <alpha-value>)',
          light: 'rgb(var(--color-primary-light) / <alpha-value>)',
          dark: 'rgb(var(--color-primary-dark) / <alpha-value>)',
        },
        background: {
          base: 'rgb(var(--color-bg-base) / <alpha-value>)',
          cream: 'rgb(var(--color-bg-cream) / <alpha-value>)',
          hover: 'rgb(var(--color-bg-hover) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          strong: 'rgb(var(--color-border-strong) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      spacing: {
        'page-desktop': '48px',
        'page-tablet': '32px',
        'page-mobile': '20px',
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
      },
    },
  },
  plugins: [
    // Markdown 正文排版（prose / prose-lg）：文章页的标题层级、列表符号、表格边框
    require('@tailwindcss/typography'),
  ],
}
