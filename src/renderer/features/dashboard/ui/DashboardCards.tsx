import {
    ArrowRight,
    Cake,
    CalendarClock,
    FileClock,
    FileText,
    FolderOpen,
    History,
    NotebookPen,
    Paperclip,
    Plus,
    ScrollText,
    TriangleAlert,
} from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

import type { RecentFile } from '../../../../shared/types/documents';
import type { RecentStatusChange } from '../../../../shared/types/history';
import type { JournalEntry } from '../../../../shared/types/journal';
import { documentsApi, journalApi } from '../../../shared/api/documents';
import { reportError } from '../../../shared/api/errors';
import { historyApi } from '../../../shared/api/personnel';
import { reportTemplatesApi } from '../../../shared/api/reports';
import FilePreviewModal, {
    type FileWithDataUrl,
} from '../../../shared/components/FilePreviewModal';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Avatar, Button, cn, EmptyState } from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';
import { useSearchJump } from '../../../stores/searchJumpStore';
import { useUserStore } from '../../../stores/userStore';
import { bucketOf, journalCounts } from '../../journal/model/journalStore';
import JournalEntryRow from '../../journal/ui/JournalEntryRow';
import { daysLeftText, type UpcomingEvent, type UpcomingKind } from '../model/upcoming';

export function openPerson(userId: number | undefined): void {
    if (!userId) return;
    const store = useUserStore.getState();
    const user = store.users.find((u) => u.id === userId);
    if (!user) return;
    store.setCurrentTab('manager');
    void store.setSelectedUser(user);
}

export function openJournal(uuid: string | 'new'): void {
    useSearchJump.getState().jump({ journal: uuid });
    useUserStore.getState().setCurrentTab('journal');
}

/** A card of the desktop: title with a count, an action, a body that scrolls. */
export function DashCard({
    icon,
    title,
    count,
    action,
    children,
    className,
    tone,
}: {
    icon: ReactNode;
    title: string;
    count?: number;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    tone?: 'danger';
}) {
    return (
        <section className={cn('card flex h-[440px] min-h-0 flex-col overflow-hidden', className)}>
            <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                <span
                    className={cn(
                        'grid size-9 shrink-0 place-items-center rounded-xl [&_svg]:size-[18px]',
                        tone === 'danger'
                            ? 'bg-danger-soft text-danger-ink'
                            : 'bg-primary-soft text-primary-ink',
                    )}
                >
                    {icon}
                </span>
                <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">
                    {title}
                    {count !== undefined && (
                        <span className="ml-2 font-mono text-[13px] font-normal text-ink-3">
                            {count}
                        </span>
                    )}
                </h2>
                {action}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </section>
    );
}

const KIND_ICONS: Record<UpcomingKind, ReactNode> = {
    'status-end': <CalendarClock />,
    'order-end': <ScrollText />,
    birthday: <Cake />,
    journal: <NotebookPen />,
};

// ------------------------------------------------------------------------ upcoming dates

export function UpcomingCard({ events }: { events: UpcomingEvent[] }) {
    const { t } = useI18nStore();
    const [kind, setKind] = useState<UpcomingKind | 'all'>('all');
    const kinds = (['all', 'status-end', 'order-end', 'birthday', 'journal'] as const).filter(
        (k) => k === 'all' || events.some((e) => e.kind === k),
    );
    const shown = kind === 'all' ? events : events.filter((e) => e.kind === kind);

    return (
        <DashCard
            icon={<CalendarClock />}
            title={t('dashboard.upcoming.title')}
            count={events.length}
        >
            {kinds.length > 2 && (
                <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2">
                    {kinds.map((k) => (
                        <button
                            key={k}
                            type="button"
                            onClick={() => setKind(k)}
                            className={cn(
                                'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                                kind === k
                                    ? 'border-primary bg-primary-soft text-primary-ink'
                                    : 'border-line text-ink-3 hover:text-ink',
                            )}
                        >
                            {t(`dashboard.upcoming.kinds.${k}`)}
                            <span className="ml-1 font-mono opacity-70">
                                {k === 'all'
                                    ? events.length
                                    : events.filter((e) => e.kind === k).length}
                            </span>
                        </button>
                    ))}
                </div>
            )}
            {shown.length === 0 ? (
                <EmptyState
                    icon={<CalendarClock />}
                    title={t('dashboard.upcoming.empty')}
                    description={t('dashboard.upcoming.emptyHint')}
                />
            ) : (
                <ul className="divide-y divide-line">
                    {shown.map((event) => (
                        <li key={event.key}>
                            <button
                                type="button"
                                onClick={() =>
                                    event.journalUuid
                                        ? openJournal(event.journalUuid)
                                        : openPerson(event.userId)
                                }
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2"
                            >
                                {event.userId ? (
                                    <Avatar name={event.title} size={34} />
                                ) : (
                                    <span className="grid size-[34px] place-items-center rounded-full bg-surface-2 text-ink-3 [&_svg]:size-4">
                                        {KIND_ICONS[event.kind]}
                                    </span>
                                )}
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-ink">
                                        {event.title}
                                    </span>
                                    <span className="flex items-center gap-1.5 truncate text-xs text-ink-3 [&_svg]:size-3.5">
                                        {KIND_ICONS[event.kind]}
                                        {event.kind === 'birthday'
                                            ? t('dashboard.upcoming.birthday', { age: event.age })
                                            : event.kind === 'status-end'
                                              ? t('dashboard.upcoming.statusEnds', {
                                                    status: event.detail,
                                                })
                                              : event.kind === 'order-end'
                                                ? t('dashboard.upcoming.orderEnds', {
                                                      title: event.detail,
                                                  })
                                                : t('dashboard.upcoming.task')}
                                    </span>
                                </span>
                                <span className="shrink-0 text-right">
                                    <span className="block font-mono text-[13px] tabular-nums text-ink">
                                        {event.date.toLocaleDateString('uk-UA', {
                                            day: '2-digit',
                                            month: '2-digit',
                                        })}
                                    </span>
                                    <span
                                        className={cn(
                                            'block text-xs',
                                            event.daysLeft < 0
                                                ? 'font-semibold text-danger-ink'
                                                : event.daysLeft <= 1
                                                  ? 'font-medium text-warning-ink'
                                                  : 'text-ink-3',
                                        )}
                                    >
                                        {daysLeftText(event.daysLeft, t)}
                                    </span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </DashCard>
    );
}

// ------------------------------------------------------------------------ journal

export function JournalCard({ entries }: { entries: JournalEntry[] }) {
    const { t } = useI18nStore();
    const counts = useMemo(() => journalCounts(entries), [entries]);
    const shown = useMemo(
        () =>
            entries
                .filter((e) => !e.done)
                .filter(
                    (e) =>
                        e.pinned ||
                        ['overdue', 'today', 'tomorrow'].includes(
                            bucketOf({ ...e, pinned: false }),
                        ),
                )
                .sort(
                    (a, b) =>
                        Number(b.pinned) - Number(a.pinned) ||
                        String(a.dueDate ?? '9').localeCompare(String(b.dueDate ?? '9')),
                )
                .slice(0, 8),
        [entries],
    );
    return (
        <DashCard
            icon={<NotebookPen />}
            title={t('dashboard.journal.title')}
            count={counts.active}
            action={
                <Button
                    size="sm"
                    icon={<Plus className="size-4" />}
                    onClick={() => openJournal('new')}
                >
                    {t('dashboard.journal.add')}
                </Button>
            }
        >
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-line px-4 py-2 text-xs text-ink-3">
                <span className={cn(counts.overdue > 0 && 'font-semibold text-danger-ink')}>
                    {t('journal.views.overdue')}: {counts.overdue}
                </span>
                <span>
                    {t('journal.views.today')}: {counts.today}
                </span>
                <span>
                    {t('journal.views.week')}: {counts.week}
                </span>
                <span>
                    {t('journal.views.pinned')}: {counts.pinned}
                </span>
            </div>
            {shown.length === 0 ? (
                <EmptyState
                    icon={<NotebookPen />}
                    title={t('dashboard.journal.empty')}
                    description={t('dashboard.journal.emptyHint')}
                />
            ) : (
                <ul className="space-y-2 p-3">
                    {shown.map((entry) => (
                        <JournalEntryRow
                            key={entry.uuid}
                            entry={entry}
                            compact
                            onOpen={(e) => openJournal(e.uuid)}
                        />
                    ))}
                </ul>
            )}
            <div className="border-t border-line px-4 py-2">
                <button
                    type="button"
                    onClick={() => useUserStore.getState().setCurrentTab('journal')}
                    className="flex items-center gap-1 text-[13px] font-medium text-primary-ink hover:underline"
                >
                    {t('dashboard.journal.openAll')} <ArrowRight className="size-3.5" />
                </button>
            </div>
        </DashCard>
    );
}

// ------------------------------------------------------------------------ status changes

function relativeTime(iso: string, t: (key: string, vars?: Record<string, unknown>) => string) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const minutes = Math.round((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return t('dashboard.time.now');
    if (minutes < 60) return t('dashboard.time.minutes', { n: minutes });
    const hours = Math.round(minutes / 60);
    if (hours < 24) return t('dashboard.time.hours', { n: hours });
    return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}

export function StatusChangesCard({ changes }: { changes: RecentStatusChange[] }) {
    const { t } = useI18nStore();
    const users = useUserStore((s) => s.users);
    const byId = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
    const shown = changes.filter((c) => byId.has(c.userId)).slice(0, 25);
    return (
        <DashCard icon={<History />} title={t('dashboard.changes.title')} count={shown.length}>
            {shown.length === 0 ? (
                <EmptyState icon={<History />} title={t('dashboard.changes.empty')} />
            ) : (
                <ul className="divide-y divide-line">
                    {shown.map((change) => {
                        const user = byId.get(change.userId)!;
                        const incomplete = !change.hasFiles || !change.period;
                        return (
                            <li key={`${change.userId}-${change.entryId}`}>
                                <button
                                    type="button"
                                    onClick={() => openPerson(change.userId)}
                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2"
                                >
                                    <Avatar name={user.fullName} src={user.photo} size={34} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-ink">
                                            {user.fullName}
                                        </span>
                                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                            {change.from && <StatusBadge status={change.from} />}
                                            {change.from && (
                                                <ArrowRight className="size-3.5 text-ink-3" />
                                            )}
                                            <StatusBadge status={change.to} />
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-right text-xs text-ink-3">
                                        <span className="block">
                                            {relativeTime(change.date, t)}
                                        </span>
                                        {incomplete && (
                                            <span
                                                className="mt-1 flex items-center justify-end gap-1 text-danger-ink"
                                                title={t('dashboard.changes.incompleteHint')}
                                            >
                                                <TriangleAlert className="size-3.5" />
                                                {!change.hasFiles
                                                    ? t('dashboard.changes.noFile')
                                                    : t('dashboard.changes.noPeriod')}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </DashCard>
    );
}

// ------------------------------------------------------------------------ recent files

const SOURCE_ICONS: Record<RecentFile['source'], ReactNode> = {
    document: <FolderOpen />,
    history: <FileClock />,
    award: <Paperclip />,
    report: <FileText />,
    journal: <NotebookPen />,
};

const MIME: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
};

function bufferToDataUrl(buffer: ArrayBuffer, name: string): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    return `data:${MIME[ext] ?? 'application/octet-stream'};base64,${btoa(binary)}`;
}

async function loadRecent(file: RecentFile): Promise<string> {
    switch (file.source) {
        case 'document':
            return documentsApi.load(file.ref.documentUuid!);
        case 'history':
            return historyApi.loadFile(file.userId!, file.ref.entryId!, file.name);
        case 'journal':
            return journalApi.loadFile(file.ref.journalUuid!, file.name);
        default:
            return bufferToDataUrl(
                await reportTemplatesApi.readFile(file.ref.filePath!),
                file.name,
            );
    }
}

export function RecentFilesCard({ files }: { files: RecentFile[] }) {
    const { t } = useI18nStore();
    const [preview, setPreview] = useState<FileWithDataUrl | null>(null);
    const open = async (file: RecentFile) => {
        try {
            const dataUrl = await loadRecent(file);
            setPreview({ name: file.name, type: dataUrl.slice(5, dataUrl.indexOf(';')), dataUrl });
        } catch (err) {
            reportError(err, { context: 'dashboard.file' });
        }
    };
    return (
        <DashCard icon={<FolderOpen />} title={t('dashboard.files.title')} count={files.length}>
            {files.length === 0 ? (
                <EmptyState
                    icon={<FolderOpen />}
                    title={t('dashboard.files.empty')}
                    description={t('dashboard.files.emptyHint')}
                />
            ) : (
                <ul className="divide-y divide-line">
                    {files.map((file) => (
                        <li
                            key={file.key}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2"
                        >
                            <span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-3 [&_svg]:size-4">
                                {SOURCE_ICONS[file.source]}
                            </span>
                            <button
                                type="button"
                                onClick={() => void open(file)}
                                className="min-w-0 flex-1 text-left"
                            >
                                <span
                                    className="block truncate text-sm font-medium text-ink hover:text-primary-ink"
                                    title={file.name}
                                >
                                    {file.name}
                                </span>
                                <span className="block truncate text-xs text-ink-3">
                                    {[
                                        t(`dashboard.files.sources.${file.source}`),
                                        file.source === 'report'
                                            ? t(`dashboard.files.reportKind.${file.context}`)
                                            : file.context,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </span>
                            </button>
                            {file.userId && file.userName && (
                                <button
                                    type="button"
                                    onClick={() => openPerson(file.userId)}
                                    className="hidden max-w-[40%] shrink-0 truncate rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-2 hover:text-primary-ink @md:block"
                                    title={t('dashboard.files.openPerson')}
                                >
                                    {file.userName}
                                </button>
                            )}
                            <span className="shrink-0 text-xs text-ink-3">
                                {relativeTime(file.date, t)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {preview && <FilePreviewModal file={preview} onClose={() => setPreview(null)} />}
        </DashCard>
    );
}
