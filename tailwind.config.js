/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './index.html',
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        'background': 'hsl(222.2, 84%, 4.9%)',
        'foreground': 'hsl(210, 40%, 98%)',
        'card': 'hsl(222.2, 84%, 4.9%)',
        'card-foreground': 'hsl(210, 40%, 98%)',
        'popover': 'hsl(222.2, 84%, 4.9%)',
        'popover-foreground': 'hsl(210, 40%, 98%)',
        'primary': 'hsl(217.2, 91.2%, 59.8%)',
        'primary-foreground': 'hsl(210, 40%, 98%)',
        'secondary': 'hsl(217, 33%, 17%)',
        'secondary-foreground': 'hsl(210, 40%, 98%)',
        'muted': 'hsl(217, 33%, 17%)',
        'muted-foreground': 'hsl(215, 20%, 65%)',
        'accent': 'hsl(217, 33%, 17%)',
        'accent-foreground': 'hsl(210, 40%, 98%)',
        'destructive': 'hsl(0, 63%, 31%)',
        'destructive-foreground': 'hsl(210, 40%, 98%)',
        'border': 'hsl(217, 33%, 17%)',
        'input': 'hsl(217, 33%, 17%)',
        'ring': 'hsl(217.2, 91.2%, 59.8%)',
      },
      borderRadius: {
        lg: `0.5rem`,
        md: `calc(0.5rem - 2px)`,
        sm: `calc(0.5rem - 4px)`,
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'lg-dark': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(ellipse at top, var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
