import path from 'path';
import { defineConfig } from 'vite';

// Main process bundle. Runtime dependencies (package.json "dependencies") stay external
// and are resolved from node_modules inside the packaged app.
export default defineConfig({
    build: {
        outDir: '.vite/build',
        emptyOutDir: true,
        target: 'node20',
        ssr: true,
        sourcemap: true,
        rollupOptions: {
            input: path.resolve(__dirname, 'src/main/main.ts'),
            external: ['electron', 'sqlite3'],
            output: {
                entryFileNames: 'main.js',
                format: 'cjs',
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
});
