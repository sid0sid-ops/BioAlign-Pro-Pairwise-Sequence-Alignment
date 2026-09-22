import js from '@eslint/js';

export default [
    {
        ignores: ['.next/**', 'dist/**', 'node_modules/**', 'coverage/**', '.system_generated/**', '.git/**']
    },
    js.configs.recommended,
    {
        files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                URL: 'readonly',
                Blob: 'readonly',
                Event: 'readonly',
                FileReader: 'readonly',
                Worker: 'readonly',
                Plotly: 'readonly',
                d3: 'readonly',
                fetch: 'readonly',
                Math: 'readonly',
                Date: 'readonly',
                self: 'readonly',
                postMessage: 'readonly',
                addEventListener: 'readonly',
                removeEventListener: 'readonly',
                process: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-undef': 'error',
            semi: ['error', 'always'],
            quotes: ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
            'no-empty': ['warn', { allowEmptyCatch: true }]
        }
    },
    {
        files: ['*.config.js', '*.config.cjs', 'postcss.config.cjs', 'tailwind.config.js', 'tests/**/*.js'],
        languageOptions: {
            globals: {
                module: 'readonly',
                require: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                process: 'readonly',
                console: 'readonly'
            }
        }
    }
];
