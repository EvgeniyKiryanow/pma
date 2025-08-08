import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        outDir: '.vite/build',
        emptyOutDir: false,
        lib: {
            entry: path.resolve(__dirname, 'src/preload.ts'),
            formats: ['cjs'],
            fileName: () => 'preload.js',
        },
        rollupOptions: {
            external: ['electron'],
        },
    },
});
