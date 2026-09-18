import { describe, expect, it } from 'vitest';

import type { StatusPeriodEntry } from '../../../../shared/types/history';
import { localDate, periodCodes, rowClosure, statusCode } from './namedListDays';

const period = (
    status: string,
    from: string,
    to: string | null,
    date = '2026-09-01T08:00:00.000Z',
    entryId = 1,
): StatusPeriodEntry => ({ userId: 1, entryId, date, status, from, to });

describe('days of the named list', () => {
    it('reads "2026-09-01" as the 1st of September on this computer, not the 31st of August', () => {
        const date = localDate('2026-09-01')!;
        expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 8, 1]);
        expect(localDate('05.09.2026')!.getDate()).toBe(5);
        expect(localDate('2026-02-30')).toBeNull();
        expect(localDate('')).toBeNull();
    });

    it('marks the days of a leave, and nothing outside it', () => {
        const codes = periodCodes([period('Відпустка', '2026-09-10', '2026-09-12')], 2026, 8, 30);
        expect(codes.slice(8, 13)).toEqual(['', 'вп', 'вп', 'вп', '']);
        expect(codes.filter(Boolean)).toHaveLength(3);
        expect(statusCode('Відпустка')).toBe('вп');
    });

    it('lets the entry written last win where periods overlap', () => {
        const codes = periodCodes(
            [
                period('Відрядження', '2026-09-05', '2026-09-15', '2026-09-06T00:00:00.000Z', 2),
                period('Відпустка', '2026-09-01', '2026-09-30', '2026-09-01T00:00:00.000Z', 1),
            ],
            2026,
            8,
            30,
        );
        expect(codes[3]).toBe('вп');
        expect(codes[4]).toBe('вд');
        expect(codes[15]).toBe('вп');
    });

    it('counts a period that crosses months, and one without an end as one day', () => {
        const codes = periodCodes(
            [period('Шпиталь / Лікарня', '2026-08-28', '2026-09-02')],
            2026,
            8,
            30,
        );
        expect(codes.slice(0, 3)).toEqual(['гп', 'гп', '']);
        expect(
            periodCodes([period('ВЛК', '2026-09-07', null)], 2026, 8, 30).filter(Boolean),
        ).toEqual(['влк']);
    });

    it('closes the row from the day an order starts, with a readable text', () => {
        expect(rowClosure('order', '2026-09-01', '1234123', 2026, 8, 30)).toEqual({
            startIndex: 0,
            label: 'У розпорядженні з 01.09.2026 — 1234123',
        });
        expect(rowClosure('excluded', '2026-09-15', '', 2026, 8, 30)).toEqual({
            startIndex: 14,
            label: 'Виключений з 15.09.2026',
        });
        // Started earlier: the whole month; starts later: not this month.
        expect(rowClosure('order', '2026-08-20', null, 2026, 8, 30)?.startIndex).toBe(0);
        expect(rowClosure('order', '2026-10-01', null, 2026, 8, 30)).toBeNull();
    });
});
