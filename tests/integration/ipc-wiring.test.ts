import { ipcMain } from 'electron';
import { describe, expect, it, vi } from 'vitest';

import { createContainer } from '../../src/main/app/container';
import { AUDIT_CHANNELS } from '../../src/shared/audit/types';
import * as channels from '../../src/shared/ipc/channels';

/**
 * Every channel the preload bridge can call must be registered by exactly one module, and
 * every one-way event must have a listener. A channel that is declared but not registered
 * fails in the window with "No handler registered", which no type check can catch.
 */
describe('IPC wiring', () => {
    const handled: string[] = [];
    const listened: string[] = [];
    vi.spyOn(ipcMain, 'handle').mockImplementation((channel: string) => {
        handled.push(channel);
    });
    vi.spyOn(ipcMain, 'on').mockImplementation(((channel: string) => {
        listened.push(channel);
    }) as unknown as typeof ipcMain.on);

    const container = createContainer();
    for (const feature of container.modules) feature.registerIpc();

    const { APP_EVENTS, AUTH_EVENTS, BACKUP_EVENTS, ...invokeGroups } = channels;
    const declared: string[] = [
        ...Object.values(invokeGroups).flatMap((group) => Object.values(group)),
        ...Object.values(AUDIT_CHANNELS),
    ];

    it('registers every declared channel', () => {
        expect(declared.filter((channel) => !handled.includes(channel))).toEqual([]);
    });

    it('registers no channel twice', () => {
        expect(handled.filter((channel, index) => handled.indexOf(channel) !== index)).toEqual([]);
    });

    it('registers only declared channels', () => {
        expect(handled.filter((channel) => !declared.includes(channel))).toEqual([]);
    });

    it('listens to every one-way event of the window', () => {
        expect(Object.values(APP_EVENTS).filter((event) => !listened.includes(event))).toEqual([]);
        expect(AUTH_EVENTS.sessionChanged).toBeTruthy();
        expect(BACKUP_EVENTS.fileOpened).toBeTruthy();
    });

    it('gives every module a unique name', () => {
        const names = container.modules.map((feature) => feature.name);
        expect(new Set(names).size).toBe(names.length);
    });
});
