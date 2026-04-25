/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
      },
      colors: {
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        primary: {
          DEFAULT: '#228B34',
          foreground: '#FFFFFF',
          light: '#34A84A',
          dark: '#1A6B28',
        },
        secondary: {
          DEFAULT: '#E8F5EB',
          foreground: '#1A6B28',
        },
        accent: {
          DEFAULT: '#E88E00',
          foreground: '#FFFFFF',
          light: '#F5A830',
          dark: '#C47800',
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          foreground: 'var(--color-muted-foreground)',
        },
        border: 'var(--color-border)',
        input: 'var(--color-input)',
        card: {
          DEFAULT: 'var(--color-card)',
          foreground: 'var(--color-card-foreground)',
        },
        success: {
          DEFAULT: '#228B34',
          light: '#E8F5EB',
          dark: '#1A6B28',
        },
        warning: {
          DEFAULT: '#E88E00',
          light: '#FEF3E0',
          dark: '#C47800',
        },
        error: {
          DEFAULT: '#E76F51',
          light: '#FDE8E3',
          dark: '#C04F35',
        },
        status: {
          pending: '#E88E00',
          pendingBg: '#FEF3E0',
          active: '#228B34',
          activeBg: '#E8F5EB',
          rejected: '#E76F51',
          rejectedBg: '#FDE8E3',
          suspended: '#9CA3AF',
          suspendedBg: '#F3F4F6',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 2px 8px rgba(34, 139, 52, 0.08), 0 1px 3px rgba(34, 139, 52, 0.06)',
        'card-hover': '0 4px 16px rgba(34, 139, 52, 0.14), 0 2px 6px rgba(34, 139, 52, 0.08)',
        'warm-sm': '0 1px 4px rgba(34, 139, 52, 0.12)',
      },
    },
  },
  plugins: [],
};