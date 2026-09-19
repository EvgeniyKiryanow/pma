import type { Logger } from '../core/logger';
import type { PersonnelRepository } from './PersonnelRepository';

/** The photo as it is kept (a data URL) and the small copy for lists. */
export type ShrunkPhoto = { photo: string; thumb: string };

/** Makes the small copy (and a smaller photo when it is too big); null when unreadable. */
export type PhotoShrinker = (photo: string) => ShrunkPhoto | null;

/**
 * One photo per step, then a pause: an old phone photo takes ~0.1–0.4 s to decode and write
 * (the old megabytes are zeroed), and the window answers between the steps.
 */
const BATCH = 1;
const PAUSE_MS = 150;

/**
 * Gives every photo its small copy for lists: photos saved by older versions, and photos
 * that came in a change log or a backup of an older version. Runs in the background, a few
 * photos at a time, so the window never waits for it. Only derived data changes (a smaller
 * copy of the same picture), so nothing is written to the change log.
 */
export class PhotoThumbnails {
    private running: Promise<number> | null = null;
    private stopped = false;

    constructor(
        private readonly people: Pick<
            PersonnelRepository,
            'photosWithoutThumb' | 'readPhoto' | 'replacePhoto'
        >,
        private readonly shrink: PhotoShrinker,
        private readonly logger: Logger,
        private readonly pause: () => Promise<void> = () =>
            new Promise((resolve) => setTimeout(resolve, PAUSE_MS)),
    ) {}

    /** Starts a pass unless one is running; resolves with the number of photos handled. */
    run(): Promise<number> {
        if (!this.running) {
            this.stopped = false;
            this.running = this.pass().finally(() => {
                this.running = null;
            });
        }
        return this.running;
    }

    stop(): void {
        this.stopped = true;
    }

    private async pass(): Promise<number> {
        let done = 0;
        const failed = new Set<number>();
        try {
            while (!this.stopped) {
                const ids = (await this.people.photosWithoutThumb(BATCH + failed.size)).filter(
                    (id) => !failed.has(id),
                );
                if (!ids.length) break;
                for (const id of ids.slice(0, BATCH)) {
                    const photo = await this.people.readPhoto(id);
                    const shrunk = photo ? this.safeShrink(photo) : null;
                    if (!photo || !shrunk) {
                        failed.add(id);
                        continue;
                    }
                    await this.people.replacePhoto(id, photo, shrunk.photo, shrunk.thumb);
                    done++;
                }
                await this.pause();
            }
        } catch (err) {
            // The database may be closing (restore, exit): the next start continues.
            this.logger.warn('Photo thumbnails paused', err);
        }
        if (done) this.logger.info(`Made small copies of ${done} photo(s)`);
        if (failed.size) this.logger.warn(`${failed.size} photo(s) could not be read`);
        return done;
    }

    private safeShrink(photo: string): ShrunkPhoto | null {
        try {
            return this.shrink(photo);
        } catch (err) {
            this.logger.warn('A photo could not be shrunk', err);
            return null;
        }
    }
}
