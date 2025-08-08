// eslint.config.js (ESM / flat config)
import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import promise from 'eslint-plugin-promise';
import react from 'eslint-plugin-react';
// окремий рекомендований набір для React (ESM)
import reactRecommended from 'eslint-plugin-react/configs/recommended.js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import security from 'eslint-plugin-security';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import sortKeysFix from 'eslint-plugin-sort-keys-fix';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    // Ігнор глобальний
    { ignores: ['dist', 'public', 'build', 'node_modules', 'vendor'] },

    // Базовий шар (усе репо)
    {
        files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
        },
        plugins: {
            prettier,
            'simple-import-sort': simpleImportSort,
            'unused-imports': unusedImports,
            promise,
            security,
            sonarjs,
        },
        rules: {
            // Базові
            'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
            'no-debugger': 'warn',

            // Promise / Security / Sonar (обережно з noise)
            ...promise.configs['flat/recommended'].rules,
            'security/detect-object-injection': 'off',
            'sonarjs/no-duplicate-string': 'off',
            'sonarjs/cognitive-complexity': ['warn', 20],

            // Імпорти
            'simple-import-sort/imports': 'warn',
            'simple-import-sort/exports': 'warn',

            // Невикор. імпорти/змінні
            'unused-imports/no-unused-imports': 'warn',
            'unused-imports/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                },
            ],

            // TS-послаблення (заміщені unused-imports)
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',

            // Prettier як правило
            'prettier/prettier': [
                'warn',
                {
                    printWidth: 100,
                    tabWidth: 4,
                    singleQuote: true,
                    trailingComma: 'all',
                    bracketSpacing: true,
                    arrowParens: 'always',
                    semi: true,
                    jsxSingleQuote: false,
                    endOfLine: 'auto',
                },
            ],
        },
        // базові recommended для JS+TS
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
    },

    // Renderer (React)
    {
        files: ['src/**/*.tsx', 'src/**/*.jsx'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: { ...globals.browser },
        },
        plugins: {
            react,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        settings: { react: { version: 'detect' } },
        rules: {
            ...reactRecommended.rules, // повний набір react recommended
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            'react/prop-types': 'off',
            'react/react-in-jsx-scope': 'off',
            'react/jsx-uses-react': 'off',
            'react/jsx-uses-vars': 'warn',
            'react/self-closing-comp': 'warn',
            'react/jsx-key': 'warn',
        },
    },

    // Main/Preload (Node середовище)
    {
        files: [
            'main/**/*.{ts,js}',
            'electron/**/*.{ts,js}',
            'src/main/**/*.{ts,js}',
            'src/preload.{ts,js}',
        ],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: { ...globals.node },
        },
        rules: {
            'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
        },
    },

    // Сортування ключів лише в preload (електрон-брідж величезний)
    {
        files: ['src/preload.{ts,js}'],
        plugins: { 'sort-keys-fix': sortKeysFix },
        rules: {
            'sort-keys-fix/sort-keys-fix': [
                'warn',
                'asc',
                { natural: true, caseSensitive: false, minKeys: 4 },
            ],
        },
    },
);
