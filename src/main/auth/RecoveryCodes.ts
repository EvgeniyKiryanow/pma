import { randomInt } from 'crypto';

/** No 0/O, 1/I/L: the code is read from paper and typed back by hand. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const GROUPS = 4;
const GROUP_LENGTH = 4;

export class RecoveryCodes {
    /** e.g. `K7QM-3XRA-PZ9D-W4TN` (~79 bits of entropy). */
    generate(): string {
        const groups: string[] = [];
        for (let g = 0; g < GROUPS; g++) {
            let group = '';
            for (let i = 0; i < GROUP_LENGTH; i++) group += ALPHABET[randomInt(ALPHABET.length)];
            groups.push(group);
        }
        return groups.join('-');
    }

    /** Case, spaces and dashes are ignored when the user types the code back. */
    normalize(input: string): string {
        return String(input ?? '')
            .toUpperCase()
            .replace(/[\s-]/g, '');
    }
}
