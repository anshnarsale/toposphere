/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // NexaLab Design System - NOC/DevTool aesthetic
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
        text: {
          primary: '#e6edf3',
          secondary: '#8b949e',
          muted: '#484f58',
          link: '#58a6ff',
        },
        link: {
          up: '#3fb950',
          negotiating: '#d29922',
          down: '#f85149',
          inactive: '#484f58',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      animation: {
        'packet-travel': 'packetTravel 1s linear forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-in-right': 'slideInRight 0.2s ease-out',
        'slide-in-left': 'slideInLeft 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        packetTravel: {
          '0%': { offsetDistance: '0%', opacity: 1 },
          '90%': { opacity: 1 },
          '100%': { offsetDistance: '100%', opacity: 0 },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideInRight: {
          from: { transform: 'translateX(20px)', opacity: 0 },
          to: { transform: 'translateX(0)', opacity: 1 },
        },
        slideInLeft: {
          from: { transform: 'translateX(-20px)', opacity: 0 },
          to: { transform: 'translateX(0)', opacity: 1 },
        },
        slideUp: {
          from: { transform: 'translateY(10px)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        },
      },
      boxShadow: {
        'device': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        'device-selected': '0 0 0 2px #58a6ff, 0 4px 12px rgba(88, 166, 255, 0.25)',
        'panel': '0 0 0 1px #21262d, 0 8px 24px rgba(0,0,0,0.5)',
        'tooltip': '0 0 0 1px #373e47, 0 4px 12px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}

