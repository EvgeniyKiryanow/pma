import type { BrowserWindow, Rectangle } from 'electron';
import fs from 'fs';
import path from 'path';

import { createLogger } from '../core/logger';
import { AppPaths } from '../core/paths';

const logger = createLogger('window');

/** Size and place of the window between starts (no data: geometry only). */
export type WindowState = { bounds: Rectangle | null; maximized: boolean };

/** First start: maximized, the smaller size comes from the screen. */
const FIRST_START: WindowState = { bounds: null, maximized: true };

/** How much of the window must lie on a screen to count as reachable. */
const VISIBLE = { width: 120, height: 60 };

function isRectangle(value: unknown): value is Rectangle {
    const r = value as Rectangle;
    return (
        !!r &&
        [r.x, r.y, r.width, r.height].every((n) => typeof n === 'number' && Number.isFinite(n)) &&
        r.width > 0 &&
        r.height > 0
    );
}

/**
 * The saved place of the window if it can still be seen on one of the screens (a second
 * monitor may be gone, the resolution may be lower), grown to the minimum size; else null.
 */
export function usableBounds(
    bounds: Rectangle | null,
    workAreas: Rectangle[],
    min: { width: number; height: number },
): Rectangle | null {
    if (!isRectangle(bounds)) return null;
    const onScreen = workAreas.some((area) => {
        const width =
            Math.min(bounds.x + bounds.width, area.x + area.width) - Math.max(bounds.x, area.x);
        const height =
            Math.min(bounds.y + bounds.height, area.y + area.height) - Math.max(bounds.y, area.y);
        return width >= VISIBLE.width && height >= VISIBLE.height;
    });
    if (!onScreen) return null;
    return {
        ...bounds,
        width: Math.max(min.width, bounds.width),
        height: Math.max(min.height, bounds.height),
    };
}

export function readWindowState(file = AppPaths.windowStateFile): WindowState {
    try {
        const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
        return {
            bounds: isRectangle(stored?.bounds) ? stored.bounds : null,
            maximized: typeof stored?.maximized === 'boolean' ? stored.maximized : true,
        };
    } catch {
        return FIRST_START;
    }
}

/** Remembers the window when it closes (written synchronously: the app is about to exit). */
export function rememberWindowState(window: BrowserWindow, file = AppPaths.windowStateFile): void {
    window.on('close', () => {
        try {
            const state: WindowState = {
                bounds: window.getNormalBounds(),
                maximized: window.isMaximized() || window.isFullScreen(),
            };
            fs.mkdirSync(path.dirname(file), { recursive: true });
            const partial = `${file}.partial`;
            fs.writeFileSync(partial, JSON.stringify(state));
            fs.renameSync(partial, file);
        } catch (err) {
            logger.warn('Window size could not be saved', err);
        }
    });
}
