import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: '.', // or 'src' if you moved index.html
  plugins: [react()],
  build: {
    outDir: 'renderer_dist', // or 'dist' if you prefer
    emptyOutDir: true,
  },
  base: './', // ✅ this is the key fix!
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
