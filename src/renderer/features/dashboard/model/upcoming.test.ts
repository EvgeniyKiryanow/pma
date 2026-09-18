import { describe, expect, it } from 'vitest';

import type { JournalEntry } from '../../../../shared/types/journal';
import type { User } from '../../../../shared/types/user';
import { upcomingEvents } from './upcoming';

const today = new Date(2026, 8, 19); // 19.09.2026
const user = (id: number, extra: Partial<User>): User =>
    ({ id, fullName: `Особа ${id}`, shpkNumber: String(id), ...extra }) as User;

describe('upcoming dates', () => {
    const users = [
        user(1, { soldierStatus: 'СЗЧ', dateOfBirth: '1990-09-21' }),
        user(2, { soldierStatus: 'Відпустка' }),
        user(3, { soldierStatus: 'В районі', dateOfBirth: '1985-12-01' }),
        user(4, { soldierStatus: 'Відпустка', shpkNumber: 'excluded', dateOfBirth: '1990-09-20' }),
    ];

    it('shows ends of the current status, orders, birthdays and dated tasks in order', () => {
        const events = upcomingEvents(
            {
                users,
                periods: [
                    // An older period of the same status: the latest one decides.
                    {
                        userId: 1,
                        entryId: 1,
                        date: '2026-09-01',
                        status: 'СЗЧ',
                        from: '2026-09-01',
                        to: '2026-09-10',
                    },
                    {
                        userId: 1,
                        entryId: 2,
                        date: '2026-09-15',
                        status: 'СЗЧ',
                        from: '15.09.2026',
                        to: '22.09.2026',
                    },
                    // Ended 5 days ago: too old to show.
                    {
                        userId: 2,
                        entryId: 3,
                        date: '2026-09-01',
                        status: 'Відпустка',
                        from: '2026-09-01',
                        to: '2026-09-14',
                    },
                    // Not the current status of person 3.
                    {
                        userId: 3,
                        entryId: 4,
                        date: '2026-09-01',
                        status: 'Шпиталь',
                        from: '2026-09-01',
                        to: '2026-09-20',
                    },
                ],
                orders: [
                    {
                        id: 9,
                        userId: 3,
                        type: 'order',
                        title: 'Відрядження',
                        date: '2026-09-01',
                        file: null,
                        period: { from: '2026-09-01', to: '2026-09-19' },
                    },
                ],
                journal: [
                    {
                        uuid: 'j',
                        title: 'Звіт',
                        dueDate: '2026-09-18',
                        done: false,
                    } as JournalEntry,
                    {
                        uuid: 'k',
                        title: 'Зроблено',
                        dueDate: '2026-09-19',
                        done: true,
                    } as JournalEntry,
                ],
            },
            { today },
        );
        expect(events.map((e) => [e.kind, e.userId ?? e.journalUuid, e.daysLeft])).toEqual([
            ['journal', 'j', -1],
            ['order-end', 3, 0],
            ['birthday', 1, 2],
            ['status-end', 1, 3],
        ]);
        expect(events.find((e) => e.kind === 'birthday')?.age).toBe(36);
    });
});
