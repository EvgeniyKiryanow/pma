import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

/**
 * Small typed JSON file with defaults. Writes go through a temp file + rename so a crash
 * never leaves a half-written settings file.
 */
export class JsonStore<T extends Record<string, unknown>> {
    private cache: T | null = null;

    constructor(
        private readonly filePath: () => string,
        private readonly defaults: T,
    ) {}

    async read(): Promise<T> {
        if (this.cache) return this.cache;
        let stored: Partial<T> = {};
        try {
            if (fs.existsSync(this.filePath())) {
                stored = JSON.parse(await fsp.readFile(this.filePath(), 'utf8'));
            }
        } catch {
            stored = {};
        }
        this.cache = deepMerge(this.defaults, stored);
        return this.cache;
    }

    async update(patch: DeepPartial<T>): Promise<T> {
        const next = deepMerge(await this.read(), patch as Partial<T>);
        const file = this.filePath();
        await fsp.mkdir(path.dirname(file), { recursive: true });
        const tmp = `${file}.tmp`;
        await fsp.writeFile(tmp, JSON.stringify(next, null, 2), 'utf8');
        await fsp.rename(tmp, file);
        this.cache = next;
        return next;
    }
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, patch: Partial<T>): T {
    const result: any = { ...base };
    for (const [key, value] of Object.entries(patch ?? {})) {
        if (value === undefined) continue;
        result[key] =
            isPlainObject(value) && isPlainObject(result[key])
                ? deepMerge(result[key], value)
                : value;
    }
    return result;
}
