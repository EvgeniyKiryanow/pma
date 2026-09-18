import { CalendarDays, Paperclip, Pencil, Pin, PinOff, Trash2, UserRound } from 'lucide-react';

import type { JournalEntry } from '../../../../shared/types/journal';
import { reportError } from '../../../shared/api/errors';
import { cn, IconButton } from '../../../shared/ui';
import { confirmAction } from '../../../shared/ui/confirm';
import { useI18nStore } from '../../../stores/i18nStore';
import { useUserStore } from '../../../stores/userStore';
import { localDate } from '../../report/model/namedListDays';
import { bucketOf, useJournalStore } from '../model/journalStore';

const PRIORITY_DOT = {
    high: 'bg-danger',
    normal: 'bg-primary',
    low: 'bg-line-strong',
} as const;

function dateText(entry: JournalEntry, t: (key: string) => string): string {
    const due = localDate(entry.dueDate);
    if (!due) return '';
    const bucket = bucketOf({ ...entry, pinned: false });
    const label =
        bucket === 'today'
            ? t('journal.buckets.today')
            : bucket === 'tomorrow'
              ? t('journal.buckets.tomorrow')
              : due.toLocaleDateString('uk-UA', {
                    day: 'numeric',
                    month: 'short',
                    weekday: 'short',
                });
    return entry.dueTime ? `${label}, ${entry.dueTime}` : label;
}

/**
 * One entry of the journal: tick it done, see when and how urgent, open it. The actions are
 * always visible — nothing is hidden until hover.
 */
export default function JournalEntryRow({
    entry,
    onOpen,
    compact,
}: {
    entry: JournalEntry;
    onOpen: (entry: JournalEntry) => void;
    /** The desktop: no delete button, one line of text. */
    compact?: boolean;
}) {
    const { t } = useI18nStore();
    const person = useUserStore((s) =>
        entry.userId ? s.users.find((u) => u.id === entry.userId) : undefined,
    );
    const overdue = !entry.done && bucketOf({ ...entry, pinned: false }) === 'overdue';
    const when = dateText(entry, t);

    const toggle = () =>
        useJournalStore
            .getState()
            .setDone(entry.uuid, !entry.done)
            .catch((err) => reportError(err, { context: 'journal.done' }));
    const pin = () =>
        useJournalStore
            .getState()
            .setPinned(entry.uuid, !entry.pinned)
            .catch((err) => reportError(err, { context: 'journal.pin' }));
    const remove = async () => {
        const ok = await confirmAction({
            title: t('journal.removeTitle'),
            message: t('journal.removeMessage', { title: entry.title }),
            confirmLabel: t('common.delete'),
            tone: 'danger',
        });
        if (ok) await useJournalStore.getState().remove(entry.uuid);
    };

    return (
        <li
            className={cn(
                'group flex items-start gap-3 rounded-xl border bg-surface px-3 py-2.5 transition-colors hover:border-line-strong',
                overdue ? 'border-danger/40' : 'border-line',
                entry.done && 'opacity-70',
            )}
        >
            <input
                type="checkbox"
                aria-label={t('journal.markDone')}
                title={entry.done ? t('journal.markOpen') : t('journal.markDone')}
                checked={entry.done}
                onChange={() => void toggle()}
                className="mt-0.5 size-[18px] shrink-0 cursor-pointer"
            />
            <button
                type="button"
                onClick={() => onOpen(entry)}
                className="min-w-0 flex-1 text-left"
            >
                <span className="flex items-center gap-2">
                    <span
                        className={cn('size-2 shrink-0 rounded-full', PRIORITY_DOT[entry.priority])}
                        title={t(`journal.priority.${entry.priority}`)}
                    />
                    <span
                        className={cn(
                            'truncate text-sm font-medium text-ink',
                            entry.done && 'line-through',
                        )}
                    >
                        {entry.title}
                    </span>
                </span>
                {!compact && entry.body && (
                    <span className="mt-0.5 line-clamp-2 block text-[13px] text-ink-3">
                        {entry.body}
                    </span>
                )}
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
                    {when && (
                        <span
                            className={cn(
                                'flex items-center gap-1',
                                overdue && 'font-medium text-danger-ink',
                            )}
                        >
                            <CalendarDays className="size-3.5" />
                            {overdue ? `${t('journal.buckets.overdue')}: ${when}` : when}
                        </span>
                    )}
                    {entry.category && (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5">
                            {entry.category}
                        </span>
                    )}
                    {person && (
                        <span className="flex items-center gap-1">
                            <UserRound className="size-3.5" />
                            {person.fullName}
                        </span>
                    )}
                    {entry.files.length > 0 && (
                        <span className="flex items-center gap-1">
                            <Paperclip className="size-3.5" />
                            {entry.files.length}
                        </span>
                    )}
                </span>
            </button>
            <span className="flex shrink-0 items-center gap-0.5">
                <IconButton
                    label={entry.pinned ? t('journal.unpin') : t('journal.pin')}
                    size="sm"
                    variant="ghost"
                    className={entry.pinned ? 'text-brass-ink' : undefined}
                    onClick={() => void pin()}
                    icon={entry.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                />
                <IconButton
                    label={t('common.edit')}
                    size="sm"
                    variant="ghost"
                    onClick={() => onOpen(entry)}
                    icon={<Pencil className="size-4" />}
                />
                {!compact && (
                    <IconButton
                        label={t('common.delete')}
                        size="sm"
                        variant="ghost"
                        className="hover:bg-danger-soft hover:text-danger-ink"
                        onClick={() => void remove()}
                        icon={<Trash2 className="size-4" />}
                    />
                )}
            </span>
        </li>
    );
}
