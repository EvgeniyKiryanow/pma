import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            external: ['electron', 'sqlite3', 'better-sqlite3', 'fs', 'path'], // exclude native modules
            output: {
                // preserve require calls for native modules
                globals: {
                    sqlite3: 'sqlite3',
                },
            },
        },
    },
    optimizeDeps: {
        exclude: ['sqlite3'],
    },
    plugins: [
        // If you use @rollup/plugin-commonjs, configure:
        // commonjsOptions: {
        //   ignoreDynamicRequires: false,
        //   dynamicRequireTargets: ['node_modules/sqlite3/lib/binding/**'],
        // },
    ],
});
