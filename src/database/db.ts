import path from 'path';
import { app } from 'electron';

export function getDbPath(): string {
    // Возвращаем путь к базе только когда Electron готов
    return path.join(app.getPath('userData'), 'users.db');
}
