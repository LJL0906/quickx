/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4A6CF7',
          hover: '#3B5DE7',
          light: 'rgba(74,108,247,0.08)',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F7F7FA',
          border: '#EBEBF0',
        },
        text: {
          primary: '#1A1A2E',
          secondary: '#6F6F80',
          muted: '#A0A0B0',
        },
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        float: '0 8px 32px rgba(0,0,0,0.08)',
        card: '0 1px 3px rgba(0,0,0,0.04)',
        popover: '0 4px 24px rgba(0,0,0,0.10)',
        search: '0 2px 6px rgba(0,0,0,0.06), 0 8px 28px rgba(0,0,0,0.14)',
      },
      fontSize: {
        '2xs': ['11px', '16px'],
        xs: ['12px', '18px'],
        sm: ['13px', '20px'],
        base: ['14px', '22px'],
        lg: ['16px', '24px'],
        xl: ['18px', '28px'],
      },
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '3.5': '14px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"Microsoft YaHei"',
          '"PingFang SC"',
          '"Noto Sans SC"',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          'Consolas',
          '"Source Code Pro"',
          'monospace',
        ],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
