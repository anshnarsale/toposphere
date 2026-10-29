/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: '#0d1117',
          grid: '#161b22',
          border: '#21262d',
        },
        surface: {
          0: '#0d1117',
          1: '#161b22',
          2: '#21262d',
          3: '#2d333b',
          4: '#373e47',
        },
        accent: {
          blue: '#58a6ff',
          'blue-dim': '#1f6feb',
          green: '#3fb950',
          'green-dim': '#238636',
          amber: '#d29922',
          'amber-dim': '#9e6a03',
          red: '#f85149',
          'red-dim': '#da3633',
          purple: '#bc8cff',
          cyan: '#39d0d8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
