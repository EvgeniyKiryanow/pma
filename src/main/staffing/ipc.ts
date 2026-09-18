import { STAFFING_CHANNELS } from '../../shared/ipc/channels';
import type { ShtatnaPosada } from '../../shared/types/shtatnaPosada';
import { toStatus } from '../ipc/legacy';
import { access, handle } from '../ipc/secureHandle';
import { requireArray, requireObject, requireString } from '../ipc/validate';
import type { StaffingService } from './StaffingService';

const requireNumber = (value: unknown) => requireString(value, 'shtat_number', { maxLength: 50 });

export function registerStaffingIpc(staffing: StaffingService): void {
    const edit = access.any('staffing.edit');

    handle(STAFFING_CHANNELS.list, access.any('staffing.view'), () => staffing.list());

    handle(
        STAFFING_CHANNELS.import,
        edit,
        (_event, positions: unknown) =>
            staffing.import(
                requireArray<ShtatnaPosada>(positions, 'positions', { maxLength: 20_000 }),
            ),
        { audit: 'staffing.import' },
    );

    handle(
        STAFFING_CHANNELS.update,
        edit,
        (_event, input: unknown) => {
            const position = requireObject(input, 'position') as ShtatnaPosada;
            requireNumber(position.shtat_number);
            return toStatus(() => staffing.update(position));
        },
        { audit: 'staffing.update' },
    );

    handle(
        STAFFING_CHANNELS.remove,
        edit,
        (_event, shtatNumber: unknown) => {
            const number = requireNumber(shtatNumber);
            return toStatus(() => staffing.remove(number));
        },
        { audit: 'staffing.delete' },
    );

    handle(
        STAFFING_CHANNELS.removeAll,
        edit,
        async () => ({ success: true, deleted: await staffing.removeAll() }),
        { audit: 'staffing.delete-all' },
    );
}
