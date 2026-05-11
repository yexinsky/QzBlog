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
          orange: '#D36F2B',
          light: '#E88B45',
          dark: '#B8591F',
        },
        background: {
          base: '#FFFFFF',
          cream: '#F5F1EA',
          hover: '#F0EBE3',
        },
        border: {
          DEFAULT: '#EBE7E0',
          strong: '#D9D2C8',
        },
        text: {
          primary: '#1A1A1A',
          secondary: '#444444',
          muted: '#777777',
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