/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      colors: {
        cream: {
          50: '#FAFAF8',
          100: '#F5F5F0',
          200: '#EEEDE6',
        },
        gold: {
          400: '#C9A84C',
          500: '#B8973E',
          600: '#9E7E2E',
        },
        glass: {
          white: 'rgba(255,255,255,0.70)',
          border: 'rgba(255,255,255,0.60)',
          dark: 'rgba(10,10,10,0.04)',
        },
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)',
        'glass-lg': '0 20px 60px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        'glass-xl': '0 40px 80px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.05)',
        'glow': '0 0 40px rgba(184,151,62,0.12)',
        'glow-lg': '0 0 80px rgba(184,151,62,0.15)',
        'inset-glass': 'inset 0 1px 0 rgba(255,255,255,0.9)',
      },
      backdropBlur: {
        'xs': '4px',
        '2xl': '40px',
        '3xl': '60px',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'premium': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },
    },
  },
  plugins: [],
}
