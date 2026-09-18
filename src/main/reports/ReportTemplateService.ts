import { AppError } from '../../shared/ipc/result';
import type { ReportTemplateRecord } from '../../shared/types/reports';
import type { Transactor } from '../db/types';
import type { ChangeJournal } from '../sync/ChangeJournal';
import type { ReportFileStore } from './ReportFileStore';
import type { ReportTemplateRepository } from './ReportTemplateRepository';

/** Templates uploaded by users: a database record plus a file in the reports folder. */
export class ReportTemplateService {
    constructor(
        private readonly transactor: Transactor,
        private readonly templates: ReportTemplateRepository,
        private readonly files: ReportFileStore,
        private readonly journal: ChangeJournal,
    ) {}

    list(): Promise<ReportTemplateRecord[]> {
        return this.templates.list();
    }

    saveFile(name: string, content: Buffer): Promise<string> {
        return this.files.save(name, content);
    }

    readFile(fileName: string): Promise<ArrayBuffer> {
        return this.files.read(fileName);
    }

    async add(name: string, fileName: string): Promise<void> {
        await this.transactor.transaction(async () => {
            const id = await this.templates.insert(name, fileName);
            await this.journal.recordRow('report_templates', id, 'insert');
        });
    }

    /** Deletes the record, and its file when no other record uses it. Throws NOT_FOUND. */
    async remove(id: number): Promise<void> {
        const removed = await this.transactor.transaction(async () => {
            const existing = await this.templates.findById(id);
            if (!existing) throw new AppError('NOT_FOUND');
            await this.templates.delete(id);
            await this.journal.record('report_templates', existing.id, 'delete', existing);
            return existing;
        });
        if (!(await this.templates.isFileUsed(removed.filePath))) {
            await this.files.remove(removed.filePath);
        }
    }
}
