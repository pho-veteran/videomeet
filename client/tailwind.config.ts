import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a73e8',
          50: '#e8f0fe',
          100: '#d2e3fc',
          200: '#aecbfa',
          300: '#8ab4f8',
          400: '#669df6',
          500: '#1a73e8',
          600: '#1557b0',
          700: '#104078',
          800: '#0b2940',
          900: '#061208',
        },
        secondary: {
          DEFAULT: '#34a853',
          50: '#e8f5e8',
          100: '#d1ebd1',
          200: '#a3d7a3',
          300: '#75c375',
          400: '#47af47',
          500: '#34a853',
          600: '#2a8642',
          700: '#206431',
          800: '#164220',
          900: '#0c200f',
        },
        danger: {
          DEFAULT: '#ea4335',
          50: '#fdeaea',
          100: '#fbd5d5',
          200: '#f7abab',
          300: '#f38181',
          400: '#ef5757',
          500: '#ea4335',
          600: '#bb362a',
          700: '#8c281f',
          800: '#5d1b14',
          900: '#2e0d0a',
        },
      },
      fontFamily: {
        sans: ['Google Sans', 'Roboto', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
      }
    },
  },
} satisfies Config
