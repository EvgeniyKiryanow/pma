import path from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Tests run in plain Node. Main-process modules that import Electron get small stubs
 * (tests/stubs), so services, migrations and the backup format can be tested without
 * starting the application.
 */
export default defineConfig({
    resolve: {
        alias: [
            { find: /^electron$/, replacement: path.resolve(__dirname, 'tests/stubs/electron.ts') },
            {
                find: /^electron-log\/main$/,
                replacement: path.resolve(__dirname, 'tests/stubs/electron-log.ts'),
            },
            { find: '@', replacement: path.resolve(__dirname, 'src') },
        ],
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
        testTimeout: 60_000,
        hookTimeout: 60_000,
        // Integration tests copy fixture databases and create temp folders; keep them serial.
        pool: 'forks',
        poolOptions: { forks: { singleFork: true } },
    },
});
