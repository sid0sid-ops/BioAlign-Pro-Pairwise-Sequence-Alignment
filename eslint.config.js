import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                window: "readonly",
                document: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                URL: "readonly",
                Blob: "readonly",
                Worker: "readonly",
                Plotly: "readonly",
                d3: "readonly",
                fetch: "readonly",
                Math: "readonly",
                Date: "readonly",
                self: "readonly",
                postMessage: "readonly",
                addEventListener: "readonly",
                removeEventListener: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error",
            "semi": ["error", "always"],
            "quotes": ["error", "single", { "avoidEscape": true }]
        }
    }
];
