import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { readWindowState, usableBounds } from './windowState';

const MIN = { width: 960, height: 600 };
const LAPTOP = { x: 0, y: 0, width: 1920, height: 1040 };
const SECOND_MONITOR = { x: 1920, y: 0, width: 1920, height: 1040 };

describe('usableBounds', () => {
    it('keeps a window that is on a screen', () => {
        const bounds = { x: 200, y: 100, width: 1200, height: 800 };
        expect(usableBounds(bounds, [LAPTOP], MIN)).toEqual(bounds);
    });

    it('drops a window left on a monitor that is gone', () => {
        const onSecond = { x: 2200, y: 100, width: 1200, height: 800 };
        expect(usableBounds(onSecond, [LAPTOP, SECOND_MONITOR], MIN)).toEqual(onSecond);
        expect(usableBounds(onSecond, [LAPTOP], MIN)).toBeNull();
    });

    it('drops a window that only peeks in at the edge', () => {
        expect(usableBounds({ x: 1880, y: 0, width: 1000, height: 700 }, [LAPTOP], MIN)).toBeNull();
    });

    it('grows a window below the minimum size', () => {
        expect(usableBounds({ x: 10, y: 10, width: 500, height: 300 }, [LAPTOP], MIN)).toEqual({
            x: 10,
            y: 10,
            width: 960,
            height: 600,
        });
    });

    it('ignores damaged values', () => {
        expect(usableBounds(null, [LAPTOP], MIN)).toBeNull();
        expect(
            usableBounds({ x: Number.NaN, y: 0, width: 800, height: 600 }, [LAPTOP], MIN),
        ).toBeNull();
    });
});

describe('readWindowState', () => {
    it('opens maximized on the first start or with a broken file', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pma-window-'));
        const file = path.join(dir, 'window-state.json');
        expect(readWindowState(file)).toEqual({ bounds: null, maximized: true });
        fs.writeFileSync(file, '{broken');
        expect(readWindowState(file)).toEqual({ bounds: null, maximized: true });
        fs.writeFileSync(
            file,
            JSON.stringify({ bounds: { x: 1, y: 2, width: 1000, height: 700 }, maximized: false }),
        );
        expect(readWindowState(file)).toEqual({
            bounds: { x: 1, y: 2, width: 1000, height: 700 },
            maximized: false,
        });
        fs.rmSync(dir, { recursive: true, force: true });
    });
});
