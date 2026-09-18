import type { AwardFile } from '../../../../../shared/types/user';
import { awardsApi } from '../../../../shared/api/awards';
import AttachedFiles from '../../../../shared/components/AttachedFiles';

/** Documents of one award (decree, order, certificate) — see AttachedFiles. */
export default function AwardFiles({
    userId,
    recordId,
    files,
    onChange,
}: {
    /** The person; missing for a card that was never saved (only new files exist then). */
    userId?: number;
    recordId: string;
    files: AwardFile[];
    /** Without it the list is read-only. */
    onChange?: (files: AwardFile[]) => void;
}) {
    return (
        <AttachedFiles
            files={files}
            onChange={onChange}
            load={(file) =>
                userId ? awardsApi.loadFile(userId, recordId, file.name) : Promise.resolve(null)
            }
        />
    );
}
