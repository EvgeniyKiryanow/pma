import { ipcRenderer } from 'electron';

/** Typed `ipcRenderer.invoke`. The main process authorizes every call; nothing here is trusted. */
export const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> =>
    ipcRenderer.invoke(channel, ...args) as Promise<T>;
