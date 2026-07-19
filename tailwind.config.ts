import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Aviation-themed colors
        aviation: {
          blue: '#0066cc',
          sky: '#87ceeb',
          warning: '#ff9900',
          danger: '#cc0000',
        },
      },
    },
  },
  plugins: [],
};

export default config;
