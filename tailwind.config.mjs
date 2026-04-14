/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'bleu-crepuscule': '#2c3e50',
        'dore-serein': '#ffd700',
        'beige-chaleureux': '#f5e5d5',
        'vert-croissance': '#556b2f',
        'blanc-coton': '#F8FBFF',
        'gris-doux': '#a9a9a9',
      },
      fontFamily: {
        comfortaa: ['Comfortaa', 'sans-serif'],
        sans: ['Lato', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
