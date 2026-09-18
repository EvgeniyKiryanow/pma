import fs from 'fs';
import path from 'path';

/**
 * A backup the program was started with — a double-click on a `.pmb` file in Windows
 * Explorer (or a second start with a file while the program runs). It waits here until the
 * restore screen takes it; the restore itself still asks for the password and a confirmation.
 */
export class OpenedBackupFile {
    private file: string | null = null;
    private readonly listeners = new Set<() => void>();

    /** Looks for a `.pmb` file among command-line arguments; true when one was taken. */
    offer(args: readonly string[]): boolean {
        const candidate = args.find(
            (arg) =>
                !arg.startsWith('-') &&
                /\.pmb$/i.test(arg) &&
                path.isAbsolute(arg) &&
                fs.existsSync(arg) &&
                fs.statSync(arg).isFile(),
        );
        if (!candidate) return false;
        this.file = candidate;
        for (const listener of this.listeners) listener();
        return true;
    }

    /** File name only: the window never sees paths. */
    name(): string | null {
        return this.file ? path.basename(this.file) : null;
    }

    /** Hands the file over once. */
    take(): string | null {
        const file = this.file;
        this.file = null;
        return file;
    }

    onOffered(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}

export const openedBackupFile = new OpenedBackupFile();
