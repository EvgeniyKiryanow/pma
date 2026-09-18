import type { CommentOrHistoryEntry } from '../types/user';
import { currentStatusName } from './statusNames';

/**
 * The status a status-change entry set. Newer entries carry it in `status`; older ones only in
 * their text: `Статус змінено з "Позиція піхоти" → "Відпустка"`.
 */
export function statusOfEntry(
    entry: Partial<Pick<CommentOrHistoryEntry, 'status' | 'description' | 'content'>>,
): string | null {
    if (entry.status?.trim()) return String(currentStatusName(entry.status.trim()));
    const match = /→\s*"([^"]+)"/.exec(`${entry.description ?? ''}\n${entry.content ?? ''}`);
    return match ? String(currentStatusName(match[1].trim())) : null;
}
