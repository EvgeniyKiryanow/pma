import type { AwardType, AwardTypeInput } from '../../../shared/types/awards';
import { bridge } from './bridge';
import { unwrap } from './call';

/** The awards register. Every function throws `ApiError` on failure. */
export const awardsApi = {
    /** The unit's own awards (brigade, local...). */
    listTypes: (): Promise<AwardType[]> => unwrap(bridge().awards.listTypes()),
    /** Adds (no uuid) or changes an own award. */
    saveType: (input: AwardTypeInput): Promise<AwardType> =>
        unwrap(bridge().awards.saveType(input)),
    /** CONFLICT while a card holds it (details.holders). */
    removeType: (uuid: string): Promise<void> => unwrap(bridge().awards.removeType(uuid)),
    /** A document of an award in a card, as a data URL. */
    loadFile: (userId: number, recordId: string, fileName: string): Promise<string> =>
        unwrap(bridge().awards.loadFile(userId, recordId, fileName)),
};
