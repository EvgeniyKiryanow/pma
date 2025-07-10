import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs'

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
   plugins: [
    {
      name: 'copy-template-on-build',
      closeBundle() {
        const source = path.resolve(__dirname, 'src/assets/templates/Картка-данних.docx');
        const dest = path.resolve(__dirname, '.vite/build/assets/templates/Картка-данних.docx');
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(source, dest);
        console.log('✅ Template copied to build');
      },
    },
  ],
});
