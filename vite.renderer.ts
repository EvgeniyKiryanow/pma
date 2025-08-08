import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
console.log('>>> RENDERER CONFIG USED:', __filename);

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
    base: './',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@pages': path.resolve(__dirname, 'src/Pages'),
            '@components': path.resolve(__dirname, 'src/components'),
            '@shared': path.resolve(__dirname, 'src/shared'),
            '@stores': path.resolve(__dirname, 'src/stores'),
            '@features': path.resolve(__dirname, 'src/features'),
            '@utils': path.resolve(__dirname, 'src/utils'),
            '@styles': path.resolve(__dirname, 'src/styles'),
            '@layouts': path.resolve(__dirname, 'src/layout'),
            '@hooks': path.resolve(__dirname, 'src/hooks'),
            '@icons': path.resolve(__dirname, 'src/icons'),
            '@types': path.resolve(__dirname, 'src/types'),
            '@locales': path.resolve(__dirname, 'src/locales'),
            '@ipc': path.resolve(__dirname, 'src/ipc'),
            '@db': path.resolve(__dirname, 'src/database'),
            '@assets': path.resolve(__dirname, 'assets'), // у тебе assets в корені
            // опційні корисні шорткати
            '@excel': path.resolve(__dirname, 'src/components/ExcelTables'),
            '@defaultAdmin': path.resolve(__dirname, 'src/components/defaultAdmin'),
        },
    },
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
                        if (id.includes('tailwindcss') || id.includes('postcss'))
                            return 'vendor_tailwind';
                        if (id.includes('sqlite')) return 'vendor_sqlite';
                        if (id.includes('bcrypt')) return 'vendor_bcrypt';
                        if (id.includes('electron-log')) return 'vendor_electronlog';
                        if (id.includes('react-router')) return 'vendor_router';

                        if (id.includes('shevchenko') || id.includes('@tensorflow'))
                            return 'vendor_shevchenko_tf';

                        // catch all other node_modules in a separate bucket
                        return 'vendor_misc';
                    }
                },
            },
        },
    },
});
