import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: '.vite/build',
    emptyOutDir: true,
    target: 'node16', // or higher
    ssr: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/main.ts'),
      external: ['electron', 'sqlite3', 'fs', 'path'],
      output: {
        entryFileNames: 'main.js',
        format: 'cjs',
      },
    },
  },
});
