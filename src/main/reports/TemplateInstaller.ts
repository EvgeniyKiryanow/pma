import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

import type { Logger } from '../core/logger';
import { AppPaths } from '../core/paths';

/** Copies bundled DOCX templates into the user's template folder without overwriting edits. */
export class TemplateInstaller {
    constructor(private readonly logger: Logger) {}

    async ensureInstalled(): Promise<number> {
        const source = AppPaths.bundledTemplates;
        if (!fs.existsSync(source)) {
            this.logger.warn(`Bundled templates folder not found: ${source}`);
            return 0;
        }
        await fsp.mkdir(AppPaths.userTemplates, { recursive: true });

        let copied = 0;
        for (const file of await fsp.readdir(source)) {
            if (!/\.docx?$/i.test(file)) continue;
            const target = path.join(AppPaths.userTemplates, file);
            if (fs.existsSync(target)) continue;
            await fsp.copyFile(path.join(source, file), target);
            copied += 1;
        }
        if (copied) this.logger.info(`Installed ${copied} bundled template(s)`);
        return copied;
    }
}
