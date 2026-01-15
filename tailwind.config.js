/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'neumorphic-bg': '#e0e5ec',
        'neumorphic-light': '#ffffff',
        'neumorphic-dark': '#a3b1c6',
        'neumorphic-shadow-dark': '#a3b1c6',
        'neumorphic-shadow-light': '#ffffff',
      },
      boxShadow: {
        'neomorph': '8px 8px 16px #a3b1c6, -8px -8px 16px #ffffff',
        'neomorph-sm': '4px 4px 8px #a3b1c6, -4px -4px 8px #ffffff',
        'neomorph-lg': '12px 12px 24px #a3b1c6, -12px -12px 24px #ffffff',
        'neomorph-inset': 'inset 6px 6px 12px #a3b1c6, inset -6px -6px 12px #ffffff',
        'neomorph-inset-sm': 'inset 4px 4px 8px #a3b1c6, inset -4px -4px 8px #ffffff',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'ping': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      fontFamily: {
        sans: ['Noto Sans KR', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
