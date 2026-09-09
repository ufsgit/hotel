/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./projects/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lato', 'sans-serif'],
      },
      colors: {
        indigo: {
          50: '#e5f3ff',
          100: '#cce7ff',
          500: '#008cff',
          600: '#0070cc',
          700: '#005499',
          900: '#0a223d',
          950: '#05111f',
        },
        blue: {
          500: '#008cff',
          600: '#0070cc',
          700: '#005499',
        },
        rose: {
          50: '#fdeee8',
          100: '#fbddd1',
          200: '#f7bba3',
          500: '#eb6125',
          600: '#bc4e1e',
        }
      }
    },
  },
  plugins: [],
}
