/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./app/src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'surface-base': 'var(--surface-base)',
        'surface-raised': 'var(--surface-raised)',
        'surface-card': 'var(--surface-card)',
        'surface-elevated': 'var(--surface-elevated)',
        'surface-border': 'var(--surface-border)',
        'surface-input': 'var(--surface-input)',
        'bg-primary': 'var(--surface-base)',
        'bg-secondary': 'var(--surface-raised)',
        'bg-tertiary': 'var(--surface-card)',
        'accent-main': 'var(--color-brand)',
        'accent-light': 'var(--color-chat)',
        'text-primary': 'var(--text-hi)',
        'text-secondary': 'var(--text-mid)',
        'text-muted': 'var(--text-lo)',
        'text-hi': 'var(--text-hi)',
        'text-mid': 'var(--text-mid)',
        'text-lo': 'var(--text-lo)',
        'border-subtle': 'var(--surface-border)',
        'color-brand': 'var(--color-brand)',
        'color-notas': 'var(--color-notas)',
        'color-estudo': 'var(--color-estudo)',
        'color-flashcards': 'var(--color-flashcards)',
        'color-gerador': 'var(--color-gerador)',
        'color-chat': 'var(--color-chat)',
        'color-grafo': 'var(--color-grafo)',
        'color-stats': 'var(--color-stats)',
        'color-warning': 'var(--color-warning)',
        'color-success': 'var(--color-success)',
        'color-error': 'var(--color-error)',
        'success': 'var(--color-success)',
        'warning': 'var(--color-warning)',
        'danger': 'var(--color-error)',
        'info': 'var(--color-info)',
        'xp': 'var(--color-gerador)',
      },
      fontSize: {
        'title-xl': ['1.75rem', { fontWeight: '600', lineHeight: '1.2' }],
        'title-l':  ['1.375rem', { fontWeight: '600', lineHeight: '1.3' }],
        'subtitle': ['1.0625rem', { fontWeight: '500', lineHeight: '1.4' }],
        'body':     ['0.9375rem', { fontWeight: '400', lineHeight: '1.5' }],
        'caption':  ['0.8125rem', { fontWeight: '400', lineHeight: '1.4' }],
        'overline': ['0.6875rem', { fontWeight: '500', letterSpacing: '0.08em' }],
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      spacing: {
        '18': '4.5rem',
      },
      borderRadius: {
        'xl2': '1.125rem',
      },
      boxShadow: {
        'glow-sm': '0 0 12px -2px var(--color-brand)',
        'glass':   'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      keyframes: {
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
}