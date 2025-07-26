import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Grief-sensitive color palette
        comfort: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },
        hope: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        memory: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        peace: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Grief-sensitive border radius
        gentle: '8px',
        embrace: '12px',
        sanctuary: '16px',
      },
      fontSize: {
        // Grief-sensitive typography scale
        whisper: ['0.75rem', { lineHeight: '1.2' }],
        gentle: ['0.875rem', { lineHeight: '1.5' }],
        comfort: ['1rem', { lineHeight: '1.5' }],
        presence: ['1.125rem', { lineHeight: '1.5' }],
        embrace: ['1.25rem', { lineHeight: '1.4' }],
        love: ['1.5rem', { lineHeight: '1.4' }],
        legacy: ['2rem', { lineHeight: '1.3' }],
        eternal: ['3rem', { lineHeight: '1.2' }],
      },
      spacing: {
        // Grief-sensitive spacing scale
        whisper: '0.25rem',
        gentle: '0.5rem',
        comfort: '1rem',
        embrace: '1.5rem',
        sanctuary: '2rem',
        sacred: '3rem',
        breath: '0.5rem',
        pause: '1rem',
        reflection: '1.5rem',
        contemplation: '2rem',
        reverence: '3rem',
      },
      fontFamily: {
        // Grief-sensitive font families
        compassionate: ['"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        gentle: ['"Source Serif Pro"', 'Georgia', 'serif'],
        supportive: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Grief-sensitive animations
        "gentle-fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0px)" },
        },
        "soft-scale": {
          from: { transform: "scale(0.98)" },
          to: { transform: "scale(1)" },
        },
        "breathing": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.02)" },
        },
        "gentle-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // Grief-sensitive animations
        "gentle-fade-in": "gentle-fade-in 0.3s ease-out",
        "soft-scale": "soft-scale 0.2s ease-out",
        "breathing": "breathing 2s ease-in-out infinite",
        "gentle-pulse": "gentle-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
export default config