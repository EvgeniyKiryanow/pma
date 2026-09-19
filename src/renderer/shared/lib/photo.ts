import { readAsDataUrl } from './pickFiles';

/** Longer side of the kept photo — enough for the card and printed forms. */
const PHOTO_SIDE = 800;
/** Shorter side of the small copy the lists show (avatars of 34–40 px, sharp on 2× screens). */
const THUMB_SIDE = 96;

function draw(bitmap: ImageBitmap, width: number, height: number, quality: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available');
    // JPEG has no transparency: a transparent picture gets a white background, not black.
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
}

/**
 * A chosen photo as the card keeps it: at most 800 px on the longer side, plus the small copy
 * for lists. A phone photo of several megabytes becomes ~100 KB, so lists, the change log and
 * backups stay light. A file the browser cannot decode is kept as it is.
 */
export async function preparePhoto(file: Blob): Promise<{ photo: string; photoThumb?: string }> {
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        return { photo: await readAsDataUrl(file) };
    }
    try {
        const { width, height } = bitmap;
        const photoScale = Math.min(1, PHOTO_SIDE / Math.max(width, height));
        const thumbScale = Math.min(1, THUMB_SIDE / Math.min(width, height));
        return {
            photo: draw(bitmap, width * photoScale, height * photoScale, 0.85),
            photoThumb: draw(bitmap, width * thumbScale, height * thumbScale, 0.8),
        };
    } finally {
        bitmap.close();
    }
}

/** The picture a list shows for a person: the small copy, or the photo of older data. */
export const listPhoto = (user: { photoThumb?: string | null; photo?: string }) =>
    user.photoThumb || user.photo || undefined;
