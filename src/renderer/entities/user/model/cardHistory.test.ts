import { describe, expect, it } from 'vitest';

import { statusOfEntry } from '../../../../shared/helpers/statusHistory';
import { foundationUa } from '../../../../shared/locales/foundation.ua';
import type { User } from '../../../../shared/types/user';
import {
    cardHistoryEntries,
    describeCardChanges,
    positionChangeEntry,
    statusChangeEntry,
} from './cardHistory';

/** The Ukrainian strings, as the app uses them. */
function t(key: string, vars: Record<string, unknown> = {}): string {
    const value = key
        .split('.')
        .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], foundationUa);
    if (typeof value !== 'string') return key;
    return value.replace(/\{\{(\w+)\}\}/g, (_, name) => String(vars[name] ?? ''));
}

const person = (extra: Partial<User> = {}): Partial<User> => ({
    fullName: 'Шевченко Тарас',
    soldierStatus: 'Позиція піхоти',
    shpkNumber: '12',
    position: 'Стрілець',
    unitMain: '1 взвод',
    awardRecords: [],
    ...extra,
});

describe('history of a card edit', () => {
    it('writes a status change as the БЧС does, with the status for the named list', () => {
        const entry = statusChangeEntry(person(), person({ soldierStatus: 'Відпустка' }), t)!;
        expect(entry.type).toBe('statusChange');
        expect(entry.status).toBe('Відпустка');
        expect(entry.previousStatus).toBe('Позиція піхоти');
        expect(entry.description).toContain('→ "Відпустка"');
        expect(statusOfEntry({ description: entry.description })).toBe('Відпустка');
        expect(statusChangeEntry(person(), person(), t)).toBeNull();
    });

    it('writes appointments, moves and releases', () => {
        expect(positionChangeEntry(person({ shpkNumber: '' }), person())?.description).toBe(
            'Призначено на посаду Стрілець (1 взвод)',
        );
        expect(
            positionChangeEntry(
                person(),
                person({ shpkNumber: '7', position: 'Кулеметник', unitMain: '2 взвод' }),
            )?.description,
        ).toBe('Переміщено з посади Стрілець (1 взвод) → Кулеметник (2 взвод)');
        expect(positionChangeEntry(person(), person({ shpkNumber: '' }))?.description).toContain(
            'звільнено з посади Стрілець (1 взвод)',
        );
        expect(positionChangeEntry(person(), person({ shpkNumber: 'excluded' }))).toBeNull();
    });

    it('lists the other changes, without repeating private numbers', () => {
        const changes = describeCardChanges(
            person({ rank: 'солдат', passportNumber: '111111' }),
            person({
                rank: 'старший солдат',
                passportNumber: '222222',
                awardRecords: [{ id: 'a', awardId: 'mod-iron-cross', status: 'submitted' }],
            }),
            t,
        );
        expect(changes).toContain('Військове звання: «солдат» → «старший солдат»');
        expect(changes).toContain('Паспорт громадянина України — Номер');
        expect(changes.join(' ')).not.toContain('222222');
        expect(changes).toContain('нагорода «Медаль «Залізний хрест»» — Подано');
    });

    it('adds nothing when nothing changed', () => {
        expect(cardHistoryEntries(person(), person(), t)).toEqual([]);
        const entries = cardHistoryEntries(
            person(),
            person({ soldierStatus: 'СЗЧ', callsign: 'Бобер' }),
            t,
        );
        expect(entries.map((e) => e.type)).toEqual(['statusChange', 'history']);
        expect(entries[1].description).toBe(
            'Картку змінено: Позивний (псевдо): «порожньо» → «Бобер»',
        );
    });
});
