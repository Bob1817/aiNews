/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        editorial: {
          night: '#f5f7fb',
          panel: '#ffffff',
          soft: '#f8fafc',
          line: 'rgba(148, 163, 184, 0.24)',
          ink: '#0f172a',
          muted: '#64748b',
          violet: '#2563eb',
          indigo: '#3b82f6',
          cyan: '#0891b2',
        },
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
        sans: ['Roboto', 'Arial', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        display: ['Newsreader', 'Georgia', 'serif'],
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
