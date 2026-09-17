import { randomUUID } from 'crypto';
import fs from 'fs';

import { AppPaths } from './paths';

type InstanceFile = { id: string; createdAt: string };

let cached: InstanceFile | null = null;

/**
 * Identity of this installation (one per computer / Windows account).
 * Stored outside the database so restoring a backup never clones another computer's identity.
 * Future offline sync uses it as the origin of changes.
 */
export function getInstanceId(): string {
    if (cached) return cached.id;
    try {
        const parsed = JSON.parse(fs.readFileSync(AppPaths.instanceFile, 'utf8')) as InstanceFile;
        if (parsed?.id) {
            cached = parsed;
            return parsed.id;
        }
    } catch {
        // first start or unreadable file: create a new identity below
    }
    cached = { id: randomUUID(), createdAt: new Date().toISOString() };
    fs.mkdirSync(AppPaths.userData, { recursive: true });
    fs.writeFileSync(AppPaths.instanceFile, JSON.stringify(cached, null, 2), 'utf8');
    return cached.id;
}
