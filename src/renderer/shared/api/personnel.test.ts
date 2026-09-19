import { beforeEach, describe, expect, it, vi } from 'vitest';

import { personnelApi } from './personnel';

/** The list the bridge gives: a new array per call, resolved when the test says so. */
function fakeBridge() {
    const waiting: ((users: unknown[]) => void)[] = [];
    const bridge = {
        fetchUsersMetadata: vi.fn(() => new Promise<unknown[]>((resolve) => waiting.push(resolve))),
        updateUser: vi.fn(async (user: { id: number }) => user),
    };
    (globalThis as { window?: unknown }).window = { electronAPI: bridge };
    return { bridge, answer: (users: unknown[]) => waiting.shift()!(users) };
}

describe('the personnel list', () => {
    let fake: ReturnType<typeof fakeBridge>;
    beforeEach(() => {
        fake = fakeBridge();
    });

    it('is read once for screens that ask at the same time', async () => {
        const first = personnelApi.list();
        const second = personnelApi.list();
        expect(fake.bridge.fetchUsersMetadata).toHaveBeenCalledTimes(1);
        fake.answer([{ id: 1 }]);
        expect(await first).toBe(await second);

        const later = personnelApi.list();
        expect(fake.bridge.fetchUsersMetadata).toHaveBeenCalledTimes(2);
        fake.answer([]);
        await later;
    });

    it('is read again when a change was saved while it was on its way', async () => {
        const before = personnelApi.list();
        await personnelApi.update({ id: 1 } as never);
        const after = personnelApi.list();
        expect(fake.bridge.fetchUsersMetadata).toHaveBeenCalledTimes(2);
        fake.answer([{ id: 1, rank: 'солдат' }]);
        fake.answer([{ id: 1, rank: 'сержант' }]);
        expect(await before).toEqual([{ id: 1, rank: 'солдат' }]);
        expect(await after).toEqual([{ id: 1, rank: 'сержант' }]);
    });
});
