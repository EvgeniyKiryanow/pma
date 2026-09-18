import bcrypt from 'bcryptjs';

import { passwordWeakness, passwordWeaknessMessage } from '../../shared/auth/passwordStrength';
import { PASSWORD_RULES } from '../../shared/auth/types';
import { AppError } from '../../shared/ipc/result';

/** Cost 10 matches hashes created by earlier versions and keeps login fast on weak laptops. */
const BCRYPT_COST = 10;

export class PasswordHasher {
    /** Used to spend the same time on unknown usernames (no user enumeration via timing). */
    private readonly dummyHash = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_COST);

    hash(plain: string): Promise<string> {
        return bcrypt.hash(plain, BCRYPT_COST);
    }

    verify(plain: string, hash: string | null | undefined): Promise<boolean> {
        return bcrypt.compare(String(plain ?? ''), hash || this.dummyHash);
    }
}

export class PasswordPolicy {
    constructor(private readonly minLength = PASSWORD_RULES.minLength) {}

    /** A sign-in password can open the data key (see DataVault), so obvious ones are refused. */
    assertValid(password: unknown): asserts password is string {
        const weakness = passwordWeakness(password, this.minLength);
        if (weakness) {
            throw new AppError('VALIDATION', passwordWeaknessMessage(weakness, this.minLength), {
                field: 'password',
                minLength: this.minLength,
                reason: weakness,
            });
        }
    }
}
