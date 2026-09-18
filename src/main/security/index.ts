import { safeStorage } from 'electron';

import { createLogger } from '../core/logger';
import { AppPaths } from '../core/paths';
import { windowsDataProtection } from '../core/windows';
import { DataEncryptor } from './DataEncryptor';
import { DataVault, type KeyProtector } from './DataVault';
import { FileCipher } from './FileCipher';

/** Ties DPAPI's copy of the key to this app (another program of the same user cannot just ask). */
const ENTROPY = Buffer.from('PManager data key v1');

/**
 * Electron's safe storage backed by a real key store: Keychain on macOS, the Secret Service
 * or KWallet on Linux. Without one, Linux falls back to `basic_text`, which "encrypts" with a
 * password built into Chromium; a key stored that way is not protected at all, so the data
 * is then opened only by signing in.
 */
function osKeyStoreAvailable(): boolean {
    if (!safeStorage?.isEncryptionAvailable?.()) return false;
    if (process.platform !== 'linux') return true;
    const backend = safeStorage.getSelectedStorageBackend?.();
    return backend !== undefined && backend !== 'basic_text' && backend !== 'unknown';
}

/** DPAPI on Windows; Electron's safe storage on other systems. Resolved on first use. */
function createProtector(): KeyProtector {
    let resolved: KeyProtector | null = null;
    const get = (): KeyProtector => {
        if (resolved) return resolved;
        const dpapi = windowsDataProtection();
        resolved = dpapi
            ? {
                  available: () => true,
                  protect: (data) => dpapi.protect(data, ENTROPY),
                  unprotect: (data) => dpapi.unprotect(data, ENTROPY),
              }
            : {
                  available: () => osKeyStoreAvailable(),
                  protect: (data) => safeStorage.encryptString(data.toString('base64')),
                  unprotect: (data) => Buffer.from(safeStorage.decryptString(data), 'base64'),
              };
        return resolved;
    };
    return {
        available: () => get().available(),
        protect: (data) => get().protect(data),
        unprotect: (data) => get().unprotect(data),
    };
}

/** The key of this computer's data set (see DataVault). */
export const dataVault = new DataVault(() => AppPaths.keystoreFile, createProtector());

/** Attachments and saved reports are encrypted with a key derived from the data key. */
export const fileCipher = new FileCipher(() => dataVault.fileKey());

export const dataEncryptor = new DataEncryptor(
    () => dataVault.databaseKey(),
    fileCipher,
    createLogger('encryption'),
);
