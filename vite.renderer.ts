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
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor_react';
            // if (id.includes('docxtemplater')) return 'vendor_docxtemplater';
            if (id.includes('pizzip')) return 'vendor_pizzip';
            // if (id.includes('docx-preview')) return 'vendor_docxpreview';
            if (id.includes('zustand')) return 'vendor_zustand';
            if (id.includes('lucide-react')) return 'vendor_lucide';
            if (id.includes('tailwindcss') || id.includes('postcss')) return 'vendor_tailwind';
            if (id.includes('sqlite')) return 'vendor_sqlite';
            if (id.includes('bcrypt')) return 'vendor_bcrypt';
            if (id.includes('electron-log')) return 'vendor_electronlog';
            if (id.includes('react-router')) return 'vendor_router';

            if (id.includes('shevchenko') || id.includes('@tensorflow')) return 'vendor_shevchenko_tf';

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

//      manualChunks(id: string) {
//   if (!id.includes('node_modules')) return;

//   // React ecosystem
//   if (id.includes('react-dom') || id.includes('react')) return 'vendor_react';
//   if (id.includes('react-router')) return 'vendor_router';
//   if (id.includes('zustand')) return 'vendor_zustand';
//   if (id.includes('lucide-react')) return 'vendor_lucide';

//   // Tailwind/PostCSS
//   if (id.includes('tailwindcss') || id.includes('postcss')) return 'vendor_tailwind';

//   // TensorFlow & Shevchenko
//   if (id.includes('@tensorflow')) return 'vendor_tensorflow';
//   if (id.includes('shevchenko')) return 'vendor_shevchenko';

//   // Word/Excel/Templating
//   if (id.includes('xlsx')) return 'vendor_xlsx';
//   if (id.includes('exceljs')) return 'vendor_exceljs';
//   if (id.includes('docx-preview')) return 'vendor_docxpreview';
//   if (id.includes('docxtemplater') || id.includes('pizzip')) return 'vendor_docxtemplater';

//   // Small libs
//   if (id.includes('sqlite')) return 'vendor_sqlite';
//   if (id.includes('bcrypt')) return 'vendor_bcrypt';
//   if (id.includes('electron-log')) return 'vendor_electronlog';

//   return 'vendor_misc';
// }
