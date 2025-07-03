import path from 'path';
import { app } from 'electron';

export function getDbPath(): string {
    return path.join(app.getPath('userData'), 'users.db');
}
