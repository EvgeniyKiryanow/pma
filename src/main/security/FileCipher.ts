import crypto from 'crypto';

const MAGIC = Buffer.from('PMAENC1\n', 'latin1');
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = MAGIC.length + IV_BYTES + TAG_BYTES;

/** True when `data` (or its first bytes) is a file encrypted by the app. */
export function isEncryptedFile(data: Buffer): boolean {
    return data.length >= MAGIC.length && data.subarray(0, MAGIC.length).equals(MAGIC);
}

export const ENCRYPTED_FILE_MAGIC_BYTES = MAGIC.length;

/**
 * Attachments and saved reports on disk: AES-256-GCM with a key derived from the data key.
 * Layout: "PMAENC1\n" | iv (12) | tag (16) | ciphertext. A file without the marker is read as it
 * is — files of older versions are converted on the next start.
 */
export class FileCipher {
    constructor(private readonly key: () => Buffer | null) {}

    /** Without a key (tests, unencrypted mode) content is stored as it is. */
    get enabled(): boolean {
        return this.key() !== null;
    }

    encrypt(plain: Buffer): Buffer {
        const key = this.key();
        if (!key) return plain;
        const iv = crypto.randomBytes(IV_BYTES);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        cipher.setAAD(MAGIC);
        const body = Buffer.concat([cipher.update(plain), cipher.final()]);
        return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body]);
    }

    decrypt(data: Buffer): Buffer {
        if (!isEncryptedFile(data)) return data;
        const key = this.key();
        if (!key) throw new Error('The data key is locked');
        if (data.length < HEADER_BYTES) throw new Error('Encrypted file is truncated');
        const iv = data.subarray(MAGIC.length, MAGIC.length + IV_BYTES);
        const tag = data.subarray(MAGIC.length + IV_BYTES, HEADER_BYTES);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAAD(MAGIC);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(data.subarray(HEADER_BYTES)), decipher.final()]);
    }
}
