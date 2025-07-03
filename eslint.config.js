import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import prettierPlugin from "eslint-plugin-prettier";
import reactRecommended from "eslint-plugin-react/configs/recommended.js";

export default tseslint.config(
    { ignores: ["dist", "public", "build", "node_modules", "vendor"] },
    {
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended,
            reactRecommended,
        ],
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
            "react": react,
            "prettier": prettierPlugin,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react-refresh/only-export-components": [
                "warn",
                { allowConstantExport: true },
            ],
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/consistent-type-definitions": ["error", "type"],
            "@typescript-eslint/no-inferrable-types": "off",
            "react/prop-types": "off",
            "react/react-in-jsx-scope": "off",
            "react/jsx-uses-react": "off",
            "react/jsx-uses-vars": "warn",
            "react/self-closing-comp": "warn",
            "react/jsx-key": "warn",
            "prettier/prettier": [
                "warn",
                {
                    "printWidth": 100,
                    "tabWidth": 4,
                    "singleQuote": true,
                    "trailingComma": "all",
                    "bracketSpacing": true,
                    "arrowParens": "always",
                    "semi": true,
                    "jsxSingleQuote": false,
                    "jsxBracketSameLine": false,
                    "endOfLine": "auto"
                }
            ],
            "no-console": ["warn", { allow: ["warn", "error"] }],
            "no-debugger": "warn",
            "no-unused-vars": "off",

            // todo
            // "react/jsx-max-props-per-line": ["warn", { "maximum": 1, "when": "always" }],
            // "react/jsx-first-prop-new-line": ["warn", "multiline"],
            // "react/jsx-closing-bracket-location": ["warn", "line-aligned"],
            // "react/jsx-indent": ["warn", 4],
            // "react/jsx-indent-props": ["warn", 4],
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    }
  );