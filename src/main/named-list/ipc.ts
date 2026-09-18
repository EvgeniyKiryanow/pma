import { NAMED_LIST_CHANNELS } from '../../shared/ipc/channels';
import { toStatus } from '../ipc/legacy';
import { access, handle } from '../ipc/secureHandle';
import { requireArray, requireInt, requireMonthKey, requireString } from '../ipc/validate';
import type { NamedListService } from './NamedListService';

export function registerNamedListIpc(namedList: NamedListService): void {
    const edit = access.any('tables.edit');

    handle(NAMED_LIST_CHANNELS.list, access.any('tables.view'), () => namedList.list());

    handle(
        NAMED_LIST_CHANNELS.create,
        edit,
        (_event, keyInput: unknown, dataInput: unknown) => {
            const key = requireMonthKey(keyInput);
            const data = requireArray(dataInput, 'data', { maxLength: 5000 });
            return toStatus(() => namedList.create(key, data), 'CONFLICT');
        },
        { audit: 'tables.named-list-create' },
    );

    // Not audited: the timesheet is filled cell by cell, dozens of times a day.
    handle(
        NAMED_LIST_CHANNELS.updateCell,
        edit,
        (
            _event,
            keyInput: unknown,
            rowIdInput: unknown,
            dayIndexInput: unknown,
            valueInput: unknown,
        ) => {
            const key = requireMonthKey(keyInput);
            const rowId = requireInt(rowIdInput, 'rowId');
            // Days of a month only: a stray index used to be written into the array as-is.
            const dayIndex = requireInt(dayIndexInput, 'dayIndex', { min: 0, max: 30 });
            const value = requireString(valueInput, 'value', { maxLength: 8, allowEmpty: true });
            return toStatus(
                () => namedList.updateCell(key, rowId, dayIndex, value),
                ['NOT_FOUND', 'VALIDATION'],
            );
        },
    );

    handle(
        NAMED_LIST_CHANNELS.remove,
        edit,
        (_event, keyInput: unknown) => {
            const key = requireMonthKey(keyInput);
            return toStatus(() => namedList.remove(key));
        },
        { audit: 'tables.named-list-delete' },
    );
}
