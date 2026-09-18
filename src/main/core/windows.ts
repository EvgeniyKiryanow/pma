/**
 * Windows APIs the app calls directly (through koffi, no native build): DPAPI to protect the
 * data key for the signed-in Windows user, and a clipboard write that Windows keeps out of
 * its clipboard history and cloud clipboard. Loaded lazily and only on Windows.
 */

type KoffiModule = typeof import('koffi');

type Api = {
    protect: (data: Buffer, entropy: Buffer) => Buffer;
    unprotect: (data: Buffer, entropy: Buffer) => Buffer;
    writePrivateText: (text: string) => boolean;
};

let api: Api | null | undefined;

function load(): Api | null {
    if (api !== undefined) return api;
    if (process.platform !== 'win32') return (api = null);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const koffi: KoffiModule = require('koffi');
    const crypt32 = koffi.load('crypt32.dll');
    const kernel32 = koffi.load('kernel32.dll');
    const user32 = koffi.load('user32.dll');

    const DATA_BLOB = koffi.struct('PMA_DATA_BLOB', { cbData: 'uint32_t', pbData: 'void *' });
    const blobPtr = koffi.pointer(DATA_BLOB);
    const CryptProtectData = crypt32.func('__stdcall', 'CryptProtectData', 'bool', [
        blobPtr, 'str16', blobPtr, 'void *', 'void *', 'uint32_t', koffi.out(blobPtr),
    ]);
    const CryptUnprotectData = crypt32.func('__stdcall', 'CryptUnprotectData', 'bool', [
        blobPtr, 'void *', blobPtr, 'void *', 'void *', 'uint32_t', koffi.out(blobPtr),
    ]);
    const LocalFree = kernel32.func('__stdcall', 'LocalFree', 'void *', ['void *']);
    const CRYPTPROTECT_UI_FORBIDDEN = 0x1;

    type Blob = { cbData: number; pbData: unknown };
    const blob = (buffer: Buffer): Blob => ({ cbData: buffer.length, pbData: buffer });
    const take = (out: Blob): Buffer => {
        const bytes = Buffer.from(
            koffi.decode(out.pbData, koffi.array('uint8_t', out.cbData)) as number[],
        );
        LocalFree(out.pbData);
        return bytes;
    };

    const OpenClipboard = user32.func('__stdcall', 'OpenClipboard', 'bool', ['void *']);
    const CloseClipboard = user32.func('__stdcall', 'CloseClipboard', 'bool', []);
    const EmptyClipboard = user32.func('__stdcall', 'EmptyClipboard', 'bool', []);
    const SetClipboardData = user32.func('__stdcall', 'SetClipboardData', 'void *', [
        'uint32_t', 'void *',
    ]);
    const RegisterClipboardFormatW = user32.func(
        '__stdcall', 'RegisterClipboardFormatW', 'uint32_t', ['str16'],
    );
    const GlobalAlloc = kernel32.func('__stdcall', 'GlobalAlloc', 'void *', ['uint32_t', 'uintptr_t']);
    const GlobalLock = kernel32.func('__stdcall', 'GlobalLock', 'void *', ['void *']);
    const GlobalUnlock = kernel32.func('__stdcall', 'GlobalUnlock', 'bool', ['void *']);
    const GlobalFree = kernel32.func('__stdcall', 'GlobalFree', 'void *', ['void *']);
    const RtlMoveMemory = kernel32.func('__stdcall', 'RtlMoveMemory', 'void', [
        'void *', 'void *', 'uintptr_t',
    ]);
    const GMEM_MOVEABLE = 0x0002;
    const CF_UNICODETEXT = 13;

    const toGlobal = (bytes: Buffer): unknown => {
        const handle = GlobalAlloc(GMEM_MOVEABLE, bytes.length);
        const pointer = GlobalLock(handle);
        RtlMoveMemory(pointer, bytes, bytes.length);
        GlobalUnlock(handle);
        return handle;
    };
    const put = (format: number, bytes: Buffer): void => {
        const handle = toGlobal(bytes);
        // On success the clipboard owns the memory; free it only if Windows refused it.
        if (!SetClipboardData(format, handle)) GlobalFree(handle);
    };

    return (api = {
        protect(data, entropy) {
            const out = {} as Blob;
            const ok = CryptProtectData(
                blob(data), 'PManager', blob(entropy), null, null, CRYPTPROTECT_UI_FORBIDDEN, out,
            );
            if (!ok) throw new Error('CryptProtectData failed');
            return take(out);
        },
        unprotect(data, entropy) {
            const out = {} as Blob;
            const ok = CryptUnprotectData(
                blob(data), null, blob(entropy), null, null, CRYPTPROTECT_UI_FORBIDDEN, out,
            );
            if (!ok) throw new Error('CryptUnprotectData failed');
            return take(out);
        },
        writePrivateText(text) {
            if (!OpenClipboard(null)) return false;
            try {
                EmptyClipboard();
                put(CF_UNICODETEXT, Buffer.from(`${text}\0`, 'utf16le'));
                put(RegisterClipboardFormatW('ExcludeClipboardContentFromMonitorProcessing'), Buffer.alloc(1));
                put(RegisterClipboardFormatW('CanIncludeInClipboardHistory'), Buffer.alloc(4));
                put(RegisterClipboardFormatW('CanUploadToCloudClipboard'), Buffer.alloc(4));
                return true;
            } finally {
                CloseClipboard();
            }
        },
    });
}

/** DPAPI (CryptProtectData) for the signed-in Windows user; null outside Windows. */
export function windowsDataProtection(): Pick<Api, 'protect' | 'unprotect'> | null {
    const loaded = load();
    return loaded ? { protect: loaded.protect, unprotect: loaded.unprotect } : null;
}

/**
 * Puts text on the clipboard marked so Windows neither stores it in the clipboard history
 * (Win + V) nor sends it to the cloud clipboard. Returns false where this is not possible;
 * the caller then uses the ordinary clipboard.
 */
export function writePrivateClipboardText(text: string): boolean {
    try {
        return load()?.writePrivateText(text) ?? false;
    } catch {
        return false;
    }
}
