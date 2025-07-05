// .eslintrc.cjs
const js = require("@eslint/js");
const globals = require("globals");
const reactHooks = require("eslint-plugin-react-hooks");
const reactRefresh = require("eslint-plugin-react-refresh");
const tseslint = require("typescript-eslint");
const react = require("eslint-plugin-react");
const prettierPlugin = require("eslint-plugin-prettier");
const reactRecommended = require("eslint-plugin-react/configs/recommended.js");

module.exports = tseslint.config(
  { ignores: ["dist", "public", "build", "node_modules", "vendor"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactRecommended,
    ],
    files: ["src/**/*.{ts,tsx}"],
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
          printWidth: 100,
          tabWidth: 4,
          singleQuote: true,
          trailingComma: "all",
          bracketSpacing: true,
          arrowParens: "always",
          semi: true,
          jsxSingleQuote: false,
          jsxBracketSameLine: false,
          endOfLine: "auto",
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "warn",
      "no-unused-vars": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  }
);
