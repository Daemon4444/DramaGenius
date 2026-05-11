/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#151524',
          50: '#1A1A2E',
          100: '#202038',
          200: '#282842',
          300: '#32324E',
          400: '#3C3C58',
        },
        prophet: {
          DEFAULT: '#F59E0B',
          light: '#FCD34D',
          dark: '#B45309',
          muted: 'rgba(245, 158, 11, 0.12)',
        },
        soul: {
          DEFAULT: '#8B5CF6',
          light: '#A78BFA',
          dark: '#6D28D9',
          muted: 'rgba(139, 92, 246, 0.12)',
        },
        arbiter: {
          DEFAULT: '#E11D48',
          light: '#FB7185',
          dark: '#9F1239',
          muted: 'rgba(225, 29, 72, 0.12)',
        },
        muted: {
          DEFAULT: 'rgba(255, 255, 255, 0.5)',
          strong: 'rgba(255, 255, 255, 0.7)',
          weak: 'rgba(255, 255, 255, 0.3)',
        },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'fade-up': 'fadeUp 0.7s ease-out forwards',
        'fade-up-delayed': 'fadeUp 0.7s ease-out 0.2s forwards',
        'scale-in': 'scaleIn 0.5s ease-out forwards',
        'slide-right': 'slideRight 0.6s ease-out forwards',
        'glow': 'glow 3s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2.5s linear infinite',
        'typing-dot': 'typingDot 1.4s infinite',
        'blur-in': 'blurIn 0.8s ease-out forwards',
        'marquee': 'marquee 30s linear infinite',
        'slide-up-branch': 'slideUpBranch 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
        'ripple-burst': 'rippleBurst 0.7s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 8px rgba(255, 255, 255, 0.05)' },
          '100%': { boxShadow: '0 0 24px rgba(255, 255, 255, 0.1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        typingDot: {
          '0%, 60%, 100%': { opacity: '0.2', transform: 'scale(0.8)' },
          '30%': { opacity: '1', transform: 'scale(1)' },
        },
        blurIn: {
          '0%': { opacity: '0', filter: 'blur(8px)', transform: 'translateY(12px)' },
          '100%': { opacity: '1', filter: 'blur(0)', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        slideUpBranch: {
          '0%': { opacity: '0', transform: 'translateY(60px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        rippleBurst: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
