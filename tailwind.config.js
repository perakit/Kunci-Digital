/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./pages/*.{vue,js,ts,jsx,tsx}", 
    "./components/*.{vue,js,ts,jsx,tsx}", 
    "./entrypoints/**/*.{vue,js,ts,jsx,tsx}"
  ],
  darkMode: true,
  theme: {
    extend: {
      height: { 'screen-minus-50': 'calc(100vh - 150px)', }
    },
  },
  plugins: [],
}

