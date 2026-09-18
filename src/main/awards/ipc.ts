import { AWARD_CHANNELS } from '../../shared/ipc/channels';
import type { AwardTypeInput } from '../../shared/types/awards';
import { access, handleResult } from '../ipc/secureHandle';
import { requireInt, requireObject, requireString } from '../ipc/validate';
import type { AwardTypeService } from './AwardTypeService';

/** Reads a document of an award in a card (see personnel/HistoryAttachments). */
export type AwardFileReader = {
    readAwardFile(userId: number, recordId: string, fileName: string): Promise<string>;
};

export function registerAwardIpc(types: AwardTypeService, files: AwardFileReader): void {
    const view = access.any('personnel.view');
    const manage = access.any('awards.manage');

    handleResult(AWARD_CHANNELS.listTypes, view, () => types.list());

    handleResult(
        AWARD_CHANNELS.saveType,
        manage,
        (_event, input: unknown) =>
            types.save(requireObject(input, 'award') as unknown as AwardTypeInput),
        { audit: 'awards.save-type' },
    );

    handleResult(
        AWARD_CHANNELS.removeType,
        manage,
        (_event, uuid: unknown) => types.remove(requireString(uuid, 'uuid', { maxLength: 64 })),
        { audit: 'awards.remove-type' },
    );

    handleResult(
        AWARD_CHANNELS.loadFile,
        view,
        (_event, userId: unknown, recordId: unknown, fileName: unknown) =>
            files.readAwardFile(
                requireInt(userId, 'userId'),
                requireString(recordId, 'recordId', { maxLength: 64 }),
                requireString(fileName, 'fileName', { maxLength: 260 }),
            ),
    );
}
