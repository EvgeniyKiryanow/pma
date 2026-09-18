/**
 * What signing in does for the data key (see security/DataVault): a verified password can
 * open the data on this computer, and while Windows cannot open the key by itself (the data
 * is "locked") the first successful sign-in opens it.
 */
export type DataKeyring = {
    /** The data could not be opened automatically at start. */
    isLocked(): boolean;
    /** Opens the data with this account's password; false when it cannot. */
    unlock(username: string, password: string): Promise<boolean>;
    /** The password was verified or set: from now on it can open the data. */
    remember(username: string, password: string): Promise<void>;
    /** The account can no longer open the data (deleted, deactivated, password reset). */
    forget(username: string): Promise<void>;
};

/** Unencrypted mode (tests): sign-in has nothing to do with keys. */
export const noKeyring: DataKeyring = {
    isLocked: () => false,
    unlock: async () => false,
    remember: async () => undefined,
    forget: async () => undefined,
};
