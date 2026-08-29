import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          200: '#bfd3fe',
          300: '#93b4fd',
          400: '#608bfa',
          500: '#3b63f5',
          600: '#2743ea',
          700: '#2033d6',
          800: '#212ead',
          900: '#212a89',
          950: '#171b54',
        },
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-links': theme('colors.brand.600'),
            a: {
              fontWeight: '500',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
            },
            'h1, h2, h3, h4': {
              fontFamily: theme('fontFamily.serif').join(', '),
              fontWeight: '700',
            },
          },
        },
        invert: {
          css: {
            '--tw-prose-links': theme('colors.brand.400'),
          },
        },
      }),
    },
  },
  plugins: [typography],
};
