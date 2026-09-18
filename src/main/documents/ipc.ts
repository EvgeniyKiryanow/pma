import { DOCUMENT_CHANNELS } from '../../shared/ipc/channels';
import type { NewDocumentsInput } from '../../shared/types/documents';
import { access, handleResult } from '../ipc/secureHandle';
import { requireArray, requireInt, requireObject, requireString } from '../ipc/validate';
import type { DocumentService } from './DocumentService';

const uuidOf = (value: unknown, field = 'uuid') => requireString(value, field, { maxLength: 64 });

export function registerDocumentIpc(documents: DocumentService): void {
    const view = access.any('personnel.view');
    const edit = access.any('personnel.edit');

    handleResult(DOCUMENT_CHANNELS.categories, view, (_event, userId: unknown) =>
        documents.categories(
            userId === undefined || userId === null ? undefined : requireInt(userId, 'userId'),
        ),
    );
    handleResult(
        DOCUMENT_CHANNELS.addCategory,
        edit,
        (_event, name: unknown) => documents.addCategory(name),
        { audit: 'documents.add-category' },
    );
    handleResult(
        DOCUMENT_CHANNELS.renameCategory,
        edit,
        (_event, uuid: unknown, name: unknown) => documents.renameCategory(uuidOf(uuid), name),
        { audit: 'documents.rename-category' },
    );
    handleResult(
        DOCUMENT_CHANNELS.removeCategory,
        edit,
        (_event, uuid: unknown) => documents.removeCategory(uuidOf(uuid)),
        { audit: 'documents.remove-category' },
    );

    handleResult(DOCUMENT_CHANNELS.list, view, (_event, userId: unknown) =>
        documents.list(requireInt(userId, 'userId')),
    );
    handleResult(
        DOCUMENT_CHANNELS.add,
        edit,
        (_event, input: unknown) => {
            const request = requireObject(input, 'documents') as unknown as NewDocumentsInput;
            requireInt(request.userId, 'userId');
            requireArray(request.files, 'files', { maxLength: 50 });
            return documents.add({
                ...request,
                categoryUuid: request.categoryUuid
                    ? uuidOf(request.categoryUuid, 'categoryUuid')
                    : null,
            });
        },
        { audit: 'documents.add' },
    );
    handleResult(
        DOCUMENT_CHANNELS.update,
        edit,
        (_event, uuid: unknown, patch: unknown) =>
            documents.update(uuidOf(uuid), requireObject(patch, 'patch')),
        { audit: 'documents.update' },
    );
    handleResult(
        DOCUMENT_CHANNELS.remove,
        edit,
        (_event, uuid: unknown) => documents.remove(uuidOf(uuid)),
        { audit: 'documents.remove' },
    );
    handleResult(DOCUMENT_CHANNELS.load, view, (_event, uuid: unknown) =>
        documents.load(uuidOf(uuid)),
    );
    handleResult(DOCUMENT_CHANNELS.recent, view, (_event, limit: unknown) =>
        documents.recent(limit === undefined ? 30 : requireInt(limit, 'limit', { max: 200 })),
    );
}
