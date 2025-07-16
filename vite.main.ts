import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs'

export default defineConfig({
  build: {
    outDir: '.vite/build',
    emptyOutDir: true,
    target: 'node16',
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
      name: 'copy-templates-on-build',
      closeBundle() {
        const srcDir = path.resolve(__dirname, 'src/assets/templates');
        const destDir = path.resolve(__dirname, '.vite/build/assets/templates');

        fs.mkdirSync(destDir, { recursive: true });

        const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.docx'));

        for (const file of files) {
          const srcFile = path.join(srcDir, file);
          const destFile = path.join(destDir, file);

          fs.copyFileSync(srcFile, destFile);
          console.log(`✅ Copied ${file}`);
        }
      },
    },
    {
  name: 'copy-python-on-build',
  closeBundle() {
    const srcPython = path.resolve(__dirname, 'src/assets/python');
    const destPython = path.resolve(__dirname, '.vite/build/assets/python');

    fs.mkdirSync(destPython, { recursive: true });

    fs.cpSync(srcPython, destPython, { recursive: true });
  }
},
  ],
});
