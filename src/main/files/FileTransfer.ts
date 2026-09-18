import type { WebContents } from 'electron';
import fsp from 'fs/promises';
import mime from 'mime-types';
import path from 'path';

import { AppError } from '../../shared/ipc/result';
import {
    type FileKind,
    MAX_TRANSFER_BYTES,
    type PickedFile,
    type SaveFileResult,
} from '../../shared/types/files';
import { chooseOpenFiles, chooseSavePath } from '../core/dialogs';
import { move, remove } from '../core/fsUtils';
import type { Logger } from '../core/logger';
import { safeFileName } from '../core/paths';

const IMAGES = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

const OPEN_FILTERS: Record<FileKind, { title: string; name: string; extensions: string[] }> = {
    excel: { title: 'Оберіть таблицю Excel', name: 'Таблиці Excel', extensions: ['xlsx', 'xls'] },
    docx: { title: 'Оберіть документ Word', name: 'Документи Word', extensions: ['docx'] },
    documents: {
        title: 'Оберіть документи',
        name: 'PDF, Word, Excel, зображення',
        extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', ...IMAGES],
    },
    images: { title: 'Оберіть фото', name: 'Зображення', extensions: IMAGES },
    'comment-files': {
        title: 'Оберіть файли',
        name: 'Зображення та PDF',
        extensions: ['pdf', 'svg', ...IMAGES],
    },
    any: { title: 'Оберіть файли', name: 'Усі файли', extensions: ['*'] },
};

const SAVE_FILTER_NAMES: Record<string, string> = {
    xlsx: 'Таблиця Excel',
    xls: 'Таблиця Excel',
    docx: 'Документ Word',
    doc: 'Документ Word',
    pdf: 'Документ PDF',
    json: 'Файл JSON',
};

/**
 * Files in and out of the app through native dialogs in the main process.
 *
 * The renderer never uses `<input type=file>` or browser downloads: both go through Windows
 * dialogs that record every chosen file in the registry. Here every dialog runs with
 * "do not add to recent", saved files are written atomically, and the last folder is
 * remembered only in memory for the running session.
 */
export class FileTransfer {
    private lastFolder: string | null = null;

    constructor(private readonly logger: Logger) {}

    /** Empty array when the dialog was closed. */
    async pick(sender: WebContents, kind: FileKind, multiple: boolean): Promise<PickedFile[]> {
        const filter = OPEN_FILTERS[kind];
        const paths = await chooseOpenFiles(
            sender,
            {
                title: filter.title,
                defaultPath: this.lastFolder ?? undefined,
                filters: [{ name: filter.name, extensions: filter.extensions }],
            },
            multiple,
        );
        if (!paths.length) return [];
        this.lastFolder = path.dirname(paths[0]);

        const files: PickedFile[] = [];
        for (const file of paths) {
            const name = path.basename(file);
            const { size } = await fsp.stat(file);
            if (size > MAX_TRANSFER_BYTES) {
                throw new AppError('VALIDATION', `Файл «${name}» завеликий (понад 150 МБ)`, {
                    field: 'file',
                });
            }
            const data = await fsp.readFile(file);
            files.push({
                name,
                type: mime.lookup(name) || 'application/octet-stream',
                size,
                data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
            });
        }
        return files;
    }

    /** Asks where to save `data`; `saved: false` when the dialog was closed. */
    async save(sender: WebContents, fileName: string, data: Buffer): Promise<SaveFileResult> {
        const name = safeFileName(fileName);
        const extension = path.extname(name).slice(1).toLowerCase();
        const target = await chooseSavePath(sender, {
            title: 'Зберегти файл',
            defaultPath: this.lastFolder ? path.join(this.lastFolder, name) : name,
            filters: extension
                ? [
                      {
                          name: SAVE_FILTER_NAMES[extension] ?? extension.toUpperCase(),
                          extensions: [extension],
                      },
                  ]
                : [],
        });
        if (!target) return { saved: false, fileName: null };
        this.lastFolder = path.dirname(target);

        // Written next to the target and renamed, so a full flash drive never leaves half a file.
        const partial = `${target}.partial`;
        try {
            await fsp.writeFile(partial, data);
            await move(partial, target);
        } catch (err) {
            await remove(partial).catch(() => undefined);
            this.logger.error('Saving an exported file failed', err);
            throw new AppError(
                'VALIDATION',
                'Не вдалося зберегти файл. Перевірте, що носій підключено і на ньому є місце.',
            );
        }
        return { saved: true, fileName: path.basename(target) };
    }
}
