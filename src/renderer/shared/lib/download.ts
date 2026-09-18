import { useI18nStore } from '../../stores/i18nStore';
import { filesApi } from '../api/files';
import { toast } from '../ui/toast';

function dataUrlToBytes(dataUrl: string): Uint8Array {
    const comma = dataUrl.indexOf(',');
    const header = dataUrl.slice(0, comma);
    const payload = dataUrl.slice(comma + 1);
    if (!header.endsWith(';base64')) return new TextEncoder().encode(decodeURIComponent(payload));
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

async function toBytes(content: ArrayBuffer | Uint8Array | Blob | string): Promise<Uint8Array> {
    if (typeof content === 'string') return dataUrlToBytes(content);
    if (content instanceof Blob) return new Uint8Array(await content.arrayBuffer());
    if (content instanceof Uint8Array) return content;
    return new Uint8Array(content);
}

/**
 * Offers `content` to the user as a file named `fileName` (a string is a data URL — history
 * attachments come that way). The main process asks where to save and writes the file, so
 * no browser download happens and Windows keeps no record of it.
 * Resolves to false when the user closed the dialog; failures throw ApiError.
 */
export async function downloadFile(
    content: ArrayBuffer | Uint8Array | Blob | string,
    fileName: string,
): Promise<boolean> {
    const result = await filesApi.save({ fileName, data: await toBytes(content) });
    if (result.saved) {
        const { t } = useI18nStore.getState();
        toast.success(t('files.saved', { file: result.fileName ?? fileName }));
    }
    return result.saved;
}
