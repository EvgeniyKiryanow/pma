import { defineModule, type ModuleContext } from '../app/module';
import type { HistoryAttachments } from '../personnel/HistoryAttachments';
import { DocumentRepository } from './DocumentRepository';
import { DocumentService } from './DocumentService';
import { registerDocumentIpc } from './ipc';

/** «Документи» of a person in categories, and the files added lately (the desktop). */
export function createDocumentsModule(context: ModuleContext, deps: { files: HistoryAttachments }) {
    const documents = new DocumentService(
        context.transactor,
        new DocumentRepository(context.db),
        deps.files,
        context.db,
    );
    return defineModule({
        name: 'documents',
        documents,
        registerIpc: () => registerDocumentIpc(documents),
    });
}
