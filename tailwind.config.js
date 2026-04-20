/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Anthropic brand colors
        'anthropic-dark': '#141413',
        'anthropic-light': '#faf9f5',
        'anthropic-mid-gray': '#b0aea5',
        'anthropic-light-gray': '#e8e6dc',
        'anthropic-orange': '#d97757',
        'anthropic-blue': '#6a9bcc',
        'anthropic-green': '#788c5d',
        // Aliases for convenience
        primary: '#d97757',
        secondary: '#6a9bcc',
        accent: '#788c5d',
        dark: '#141413',
        light: '#faf9f5',
      },
      fontFamily: {
        sans: ['Poppins', 'Arial', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
        display: ['Poppins', 'Arial', 'sans-serif'],
      },
      scrollbar: {
        hide: {
          display: 'none',
        },
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      });
    },
  ],
}
