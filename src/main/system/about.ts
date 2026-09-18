import { app } from 'electron';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';

import type { AboutInfo } from '../../shared/types/system';
import { logFilePath } from '../core/logger';
import { AppPaths } from '../core/paths';

/** When this build was made: the time the main bundle was written. */
function builtAt(): string | null {
    try {
        return fs.statSync(__filename).mtime.toISOString();
    } catch {
        return null;
    }
}

function developer(): AboutInfo['developer'] {
    try {
        const pkg = JSON.parse(
            fs.readFileSync(path.join(app.getAppPath(), 'package.json'), 'utf8'),
        );
        const author = pkg.author;
        if (typeof author === 'string') return { name: author, email: null };
        return {
            name: String(author?.name ?? ''),
            email: author?.email ? String(author.email) : null,
        };
    } catch {
        return { name: '', email: null };
    }
}

function system(): string {
    const name =
        process.platform === 'win32'
            ? 'Windows'
            : process.platform === 'darwin'
              ? 'macOS'
              : process.platform === 'linux'
                ? 'Linux'
                : process.platform;
    return `${name} ${os.release()} (${process.arch})`;
}

/** «Про програму»: what support needs to know about this installation. */
export function aboutInfo(): AboutInfo {
    return {
        version: app.getVersion(),
        builtAt: builtAt(),
        system: system(),
        engine: `Electron ${process.versions.electron ?? '—'}`,
        dataFolder: AppPaths.userData,
        developer: developer(),
    };
}

/**
 * The log for the developer: the older part (after rotation) first, then the current file,
 * under a line with the version and the system. The log holds no personal data by design.
 */
export async function supportLog(): Promise<string> {
    const info = aboutInfo();
    const current = logFilePath();
    const older = current.replace(/\.log$/, '.old.log');
    const parts = [
        `PManager ${info.version} · ${info.system} · ${info.engine} · зібрано ${info.builtAt ?? '—'}`,
    ];
    for (const file of [older, current]) {
        if (fs.existsSync(file)) parts.push(await fsp.readFile(file, 'utf8'));
    }
    return `${parts.join('\n\n')}\n`;
}
