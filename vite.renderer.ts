import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    plugins: [
        react(),
        // Content Security Policy for the packaged app only: the page may load its own files,
        // inline styles (docx preview) and data/blob images, and nothing from the network.
        // Not applied in development, where Vite injects its own inline scripts.
        {
            name: 'content-security-policy',
            apply: 'build',
            transformIndexHtml(html: string) {
                const policy = [
                    "default-src 'none'",
                    "script-src 'self'",
                    "style-src 'self' 'unsafe-inline'",
                    "img-src 'self' data: blob:",
                    "font-src 'self' data:",
                    "media-src 'self' data: blob:",
                    "connect-src 'self' data: blob:",
                    "worker-src 'self' blob:",
                    "object-src 'none'",
                    "frame-src 'none'",
                    "base-uri 'none'",
                    "form-action 'none'",
                ].join('; ');
                return html.replace(
                    '<head>',
                    `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
                );
            },
        },
        // Bundle analysis only on demand: `npm run analyze`
        process.env.ANALYZE &&
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
