import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

export default defineConfig({
  root: '.',
  plugins: [
    react(),
    visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    outDir: 'renderer_dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
        external: [
    '@tensorflow/tfjs', // ⛔ prevent bundling
    '@tensorflow/tfjs-core',
    '@tensorflow/tfjs-backend-webgl',
    '@tensorflow/tfjs-backend-cpu',
    '@tensorflow/tfjs-layers',
  ],
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor_react';
            // if (id.includes('docxtemplater')) return 'vendor_docxtemplater';
            if (id.includes('pizzip')) return 'vendor_pizzip';
            if (id.includes('docx-preview')) return 'vendor_docxpreview';
            if (id.includes('zustand')) return 'vendor_zustand';
            if (id.includes('shevchenko')) return 'vendor_shevchenko';
            if (id.includes('lucide-react')) return 'vendor_lucide';
            if (id.includes('tailwindcss') || id.includes('postcss')) return 'vendor_tailwind';
            if (id.includes('sqlite')) return 'vendor_sqlite';
            if (id.includes('bcrypt')) return 'vendor_bcrypt';
            if (id.includes('electron-log')) return 'vendor_electronlog';
            if (id.includes('react-router')) return 'vendor_router';

            // catch all other node_modules in a separate bucket
            return 'vendor_misc';
          }
        },
      },
    },
  },
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
