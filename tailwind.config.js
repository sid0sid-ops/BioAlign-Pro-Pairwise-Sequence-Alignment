/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        "./index.html",
        "./js/**/*.js",
        "./ui/**/*.js",
        "./visualization/**/*.js",
        "./core/**/*.js",
        "./export/**/*.js"
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'Roboto', 'sans-serif'],
                mono: ['Fira Code', 'monospace'],
            },
            fontSize: {
                'xs': 'clamp(0.7rem, 0.65vw + 0.5rem, 0.75rem)',
                'sm': 'clamp(0.75rem, 0.7vw + 0.5rem, 0.875rem)',
                'base': 'clamp(0.875rem, 0.8vw + 0.5rem, 1rem)',
                'lg': 'clamp(1rem, 0.9vw + 0.5rem, 1.125rem)',
                'xl': 'clamp(1.125rem, 1vw + 0.5rem, 1.25rem)',
                '2xl': 'clamp(1.25rem, 1.25vw + 0.75rem, 1.5rem)',
                '3xl': 'clamp(1.5rem, 1.5vw + 1rem, 1.875rem)',
                '4xl': 'clamp(1.75rem, 2vw + 1rem, 2.25rem)',
                '5xl': 'clamp(2rem, 2.5vw + 1rem, 3rem)',
            },
            spacing: {
                '1': 'calc(var(--spacing-xs) / 2)',
                '2': 'var(--spacing-xs)',
                '3': 'var(--spacing-sm)',
                '4': 'var(--spacing-md)',
                '5': 'calc(var(--spacing-md) * 1.25)',
                '6': 'var(--spacing-lg)',
                '8': 'var(--spacing-xl)',
                '10': 'calc(var(--spacing-xl) * 1.25)',
                '12': 'var(--spacing-2xl)',
                '16': 'calc(var(--spacing-2xl) * 1.33)',
            },
            colors: {
                background: 'var(--bg)',
                surface: 'var(--surface)',
                surfaceHover: 'var(--surface-hover)',
                primary: 'var(--primary)',
                destructive: 'var(--destructive)',
                muted: 'var(--muted)',
                border: 'var(--border)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' }
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                }
            }
        }
    },
    plugins: [
        require('@tailwindcss/typography'),
        require('@tailwindcss/forms'),
        require('@tailwindcss/aspect-ratio'),
    ],
}