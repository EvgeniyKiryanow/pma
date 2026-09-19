import { nativeImage } from 'electron';

import type { PhotoShrinker } from './PhotoThumbnails';

/** Longer side of a kept photo — enough for the card and printed forms. */
const PHOTO_SIDE = 800;
/** Photos smaller than this are kept as they are. */
const PHOTO_KEEP_BYTES = 300_000;
/** Shorter side of the small copy (avatars are 34–40 px, sharp on 2× screens). */
const THUMB_SIDE = 96;

const jpeg = (image: Electron.NativeImage, quality: number) =>
    `data:image/jpeg;base64,${image.toJPEG(quality).toString('base64')}`;

/** Shrinks with Electron's own image decoder (JPEG/PNG), no extra library. */
export const shrinkWithNativeImage: PhotoShrinker = (photo) => {
    const image = nativeImage.createFromDataURL(photo);
    if (image.isEmpty()) return null;
    const { width, height } = image.getSize();
    if (!width || !height) return null;

    const longer = Math.max(width, height);
    let kept = photo;
    // The small copy is made from the smaller picture: cheaper, the same result.
    let source = image;
    if (photo.length > PHOTO_KEEP_BYTES || longer > PHOTO_SIDE * 1.5) {
        const scale = Math.min(1, PHOTO_SIDE / longer);
        source = image.resize({
            width: Math.round(width * scale),
            height: Math.round(height * scale),
            quality: 'better',
        });
        kept = jpeg(source, 85);
    }
    const size = source.getSize();
    const scale = Math.min(1, THUMB_SIDE / Math.min(size.width, size.height));
    const thumb = jpeg(
        source.resize({
            width: Math.max(1, Math.round(size.width * scale)),
            height: Math.max(1, Math.round(size.height * scale)),
            quality: 'good',
        }),
        80,
    );
    return { photo: kept, thumb };
};
