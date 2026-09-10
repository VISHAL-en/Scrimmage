/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Global Single Source of Truth Theme
        'ink-black': '#181716',
        'navy': '#181716',
        'on-background': '#181716',
        'on-surface': '#181716',
        'primary': '#181716',

        'battle-red': '#FF2A42',
        'hot-pink': '#FF2A42',
        'error': '#FF2A42',
        'secondary': '#FF2A42',

        'scream-yellow': '#FFC700',
        'gold-yellow': '#FFC700',
        'primary-container': '#FFC700',
        'primary-fixed': '#FFC700',

        'acid-green': '#70DE00',
        'lime-green': '#70DE00',

        'electric-blue': '#1A62FF',
        'tertiary': '#1A62FF',
        'tertiary-container': '#1A62FF',

        'paper-cream': '#F5ECD7',
        'background': '#F5ECD7',

        'on-surface-variant': '#38332B',
        'surface': '#FFFFFF',
        'surface-container': '#FAF5EA',
        'surface-variant': '#EFE6D8',
      },
      fontFamily: {
        'anton': ['Anton', 'sans-serif'],
        'dm-sans': ['DM Sans', 'sans-serif'],
        'headline-lg': ['Anton', 'sans-serif'],
        'headline-sm': ['Anton', 'sans-serif'],
        'headline-md': ['Anton', 'sans-serif'],
        'display-xl': ['Anton', 'sans-serif'],
        'headline-lg-mobile': ['Anton', 'sans-serif'],
        'body-lg': ['DM Sans', 'sans-serif'],
        'body-md': ['DM Sans', 'sans-serif'],
        'label-bold': ['DM Sans', 'sans-serif'],
      },
      fontSize: {
        'label-bold': ['14px', { lineHeight: '1.2', letterSpacing: '0.05em', fontWeight: '700' }],
        'headline-lg': ['48px', { lineHeight: '1.1', letterSpacing: '0.02em', fontWeight: '400' }],
        'headline-sm': ['24px', { lineHeight: '1.2', fontWeight: '400' }],
        'headline-md': ['32px', { lineHeight: '1.1', letterSpacing: '0.01em', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '500' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'display-xl': ['72px', { lineHeight: '1.0', letterSpacing: '0.02em', fontWeight: '400' }],
        'headline-lg-mobile': ['36px', { lineHeight: '1.1', fontWeight: '400' }],
      },
      spacing: {
        'margin-desktop': '48px',
        'gutter': '24px',
        'margin-mobile': '16px',
        'unit': '8px',
        'card-padding': '20px',
      },
      boxShadow: {
        'hard': '4px 4px 0px 0px #181716',
        'hard-sm': '2px 2px 0px 0px #181716',
        'hard-lg': '6px 6px 0px 0px #181716',
        'tape': '2px 2px 0px 0px #181716',
        'hard-yellow': '4px 4px 0px 0px #181716',
        'hard-red': '4px 4px 0px 0px #181716',
      },
      borderRadius: {
        'DEFAULT': '0.25rem',
        'sm': '0.125rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        'full': '9999px',
      },
    },
  },
  plugins: [],
}
