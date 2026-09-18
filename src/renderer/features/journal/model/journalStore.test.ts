import { describe, expect, it } from 'vitest';

import type { JournalEntry } from '../../../../shared/types/journal';
import { groupJournal, journalCategories, journalCounts } from './journalStore';

const today = new Date(2026, 8, 19);
const entry = (uuid: string, extra: Partial<JournalEntry> = {}): JournalEntry => ({
    uuid,
    title: uuid,
    body: '',
    dueDate: null,
    dueTime: null,
    priority: 'normal',
    category: '',
    done: false,
    doneAt: null,
    pinned: false,
    files: [],
    userId: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...extra,
});

const entries = [
    entry('overdue', { dueDate: '2026-09-17', category: 'Штаб' }),
    entry('today-low', { dueDate: '2026-09-19', priority: 'low' }),
    entry('today-high', { dueDate: '2026-09-19', priority: 'high', category: 'Штаб' }),
    entry('tomorrow', { dueDate: '2026-09-20' }),
    entry('week', { dueDate: '2026-09-24', category: 'Тил' }),
    entry('later', { dueDate: '2026-10-30' }),
    entry('undated'),
    entry('pinned', { pinned: true, dueDate: '2026-09-17' }),
    entry('done', { done: true, doneAt: '2026-09-18T10:00:00Z', dueDate: '2026-09-18' }),
];

describe('the journal lists', () => {
    it('groups by what is due, pinned first, done last, the urgent first inside a day', () => {
        const groups = groupJournal(entries, { view: 'all', query: '', category: '' }, today);
        expect(groups.map((g) => [g.bucket, g.entries.map((e) => e.uuid)])).toEqual([
            ['pinned', ['pinned']],
            ['overdue', ['overdue']],
            ['today', ['today-high', 'today-low']],
            ['tomorrow', ['tomorrow']],
            ['week', ['week']],
            ['later', ['later']],
            ['undated', ['undated']],
            ['done', ['done']],
        ]);
    });

    it('filters by view, category and words, and counts for the chips', () => {
        const keys = (view: 'today' | 'week' | 'done', category = '', query = '') =>
            groupJournal(entries, { view, category, query }, today).flatMap((g) =>
                g.entries.map((e) => e.uuid),
            );
        expect(keys('today')).toEqual(['pinned', 'overdue', 'today-high', 'today-low']);
        expect(keys('week', 'Штаб')).toEqual(['overdue', 'today-high']);
        expect(keys('done')).toEqual(['done']);
        expect(keys('week', '', 'tomor')).toEqual(['tomorrow']);
        expect(journalCounts(entries, today)).toMatchObject({
            active: 8,
            overdue: 2,
            today: 4,
            week: 6,
            pinned: 1,
            done: 1,
        });
        expect(journalCategories(entries)).toEqual(['Штаб', 'Тил']);
    });
});
