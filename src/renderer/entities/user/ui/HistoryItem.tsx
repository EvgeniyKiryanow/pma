import {
    ArrowRight,
    Briefcase,
    CalendarRange,
    Download,
    FileText,
    FileWarning,
    Pencil,
    RefreshCw,
    Send,
    StickyNote,
    Trash2,
    UserCheck,
    UserX,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { CommentOrHistoryEntry } from '../../../../shared/types/user';
import { FileWithDataUrl } from '../../../shared/components/FilePreviewModal';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { cn, formatDate, IconButton } from '../../../shared/ui';
import { confirmAction } from '../../../shared/ui/confirm';
import { useI18nStore } from '../../../stores/i18nStore';

type Props = {
    userId: any;
    entry: CommentOrHistoryEntry;
    canEdit?: boolean;
    onDelete: (id: number) => void;
    onEdit: (entry: CommentOrHistoryEntry) => void;
    onPreviewFile: (file: FileWithDataUrl) => void;
};

type Kind = {
    label: string;
    icon: ReactNode;
    /** Marker on the timeline. */
    marker: string;
};

export default function HistoryItem({
    entry,
    onDelete,
    onEdit,
    userId,
    onPreviewFile,
    canEdit = true,
}: Props) {
    const { t } = useI18nStore();
    const [showFullDesc, setShowFullDesc] = useState(false);

    const handlePreviewFile = async (file: any) => {
        if (file.dataUrl) {
            onPreviewFile(file);
            return;
        }
        const { dataUrl } = await window.electronAPI.loadHistoryFile(userId, entry.id, file.name);
        onPreviewFile({ ...file, dataUrl });
    };

    const handleDownload = async (file: { name: string; dataUrl?: string }) => {
        const dataUrl =
            file.dataUrl ??
            (await window.electronAPI.loadHistoryFile(userId, entry.id, file.name)).dataUrl;
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = file.name;
        a.click();
    };

    const handleDelete = async () => {
        const confirmed = await confirmAction({
            title: 'Видалити запис історії?',
            message: t('history.confirmDelete'),
            confirmLabel: t('common.delete'),
            tone: 'danger',
        });
        if (confirmed) onDelete(entry.id);
    };

    const isStatusChange = entry.type === 'statusChange';
    const date = new Date(entry.date);
    const dateFormatted = Number.isNaN(date.getTime())
        ? entry.date
        : date.toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' });

    const description = entry.description || '';

    let prevStatus: string | null = null;
    let newStatus: string | null = null;
    if (isStatusChange) {
        const match = description.match(/"(.+?)"\s*→\s*"(.+?)"/);
        if (match) {
            prevStatus = match[1];
            newStatus = match[2];
        }
    }
    // The status line is shown as chips; keep only the free text written by the user.
    const statusNote = isStatusChange
        ? description
              .split('\n')
              .filter((line) => !/Статус змінено з/.test(line))
              .join('\n')
              .trim()
        : '';

    const isPosadaChange =
        description.includes('Призначено на посаду') ||
        description.includes('Переміщено з посади') ||
        description.includes('звільнено з посади');

    let oldPosada: string | null = null;
    let newPosada: string | null = null;

    if (description.includes('Переміщено з посади')) {
        const match = description.match(/Переміщено з посади (.+?) → (.+)/);
        if (match) {
            oldPosada = match[1].trim();
            newPosada = match[2].trim();
        }
    } else if (description.includes('звільнено з посади')) {
        oldPosada = description.replace(/.*звільнено з посади\s*/, '').trim();
        newPosada = '— (прибрано)';
    } else if (description.includes('Призначено на посаду')) {
        newPosada = description.replace('Призначено на посаду', '').trim();
    }
    const isIncompleteStatusChange =
        isStatusChange && (!entry.period?.from || !entry.files || entry.files.length === 0);

    const kind: Kind = isStatusChange
        ? {
              label: 'Зміна статусу',
              icon: <RefreshCw />,
              marker: 'bg-primary text-on-primary',
          }
        : isPosadaChange
          ? {
                label: 'Зміна посади',
                icon: <Briefcase />,
                marker: 'bg-info text-[oklch(99%_0_0)] dark:text-[oklch(20%_0.03_240)]',
            }
          : entry.type === 'order'
            ? {
                  label: 'Розпорядження',
                  icon: <Send />,
                  marker: 'bg-warning text-[oklch(25%_0.05_70)]',
              }
            : entry.type === 'exclude'
              ? {
                    label: 'Виключення',
                    icon: <UserX />,
                    marker: 'bg-danger text-on-danger',
                }
              : entry.type === 'restore'
                ? {
                      label: 'Відновлення',
                      icon: <UserCheck />,
                      marker: 'bg-success text-[oklch(99%_0_0)] dark:text-[oklch(20%_0.03_150)]',
                  }
                : {
                      label: t(`historyItem.type.${entry.type}`).startsWith('historyItem.')
                          ? 'Запис'
                          : t(`historyItem.type.${entry.type}`),
                      icon: <StickyNote />,
                      marker: 'bg-surface-3 text-ink-2',
                  };

    const longText = !isStatusChange && !isPosadaChange && description.length > 220;
    const typeNote = entry.type === 'order' || entry.type === 'exclude' || entry.type === 'restore';

    return (
        <li className="group/item relative pb-4 pl-10 last:pb-0">
            {/* Timeline rail and marker */}
            <span className="absolute bottom-0 left-[13px] top-8 w-px bg-line group-last/item:hidden" />
            <span
                className={cn(
                    'absolute left-0 top-1 grid size-[27px] place-items-center rounded-full ring-4 ring-surface [&_svg]:size-3.5',
                    isIncompleteStatusChange ? 'bg-danger text-on-danger' : kind.marker,
                )}
            >
                {isIncompleteStatusChange ? <FileWarning /> : kind.icon}
            </span>

            <article
                className={cn(
                    'rounded-xl border bg-surface p-4 transition-shadow hover:shadow-card',
                    isIncompleteStatusChange ? 'border-danger-line' : 'border-line',
                )}
            >
                <header className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-ink">{kind.label}</p>
                        <p className="text-xs text-ink-3">
                            {dateFormatted}
                            {entry.author && entry.author !== 'System' && entry.author !== 'You'
                                ? ` · ${entry.author}`
                                : ''}
                        </p>
                    </div>
                    {canEdit && (
                        <div className="flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/item:opacity-100">
                            <IconButton
                                label="Редагувати запис"
                                size="xs"
                                onClick={() => onEdit(entry)}
                                icon={<Pencil className="size-3.5" />}
                            />
                            <IconButton
                                label={t('historyItem.delete')}
                                size="xs"
                                className="hover:bg-danger-soft hover:text-danger-ink"
                                onClick={() => void handleDelete()}
                                icon={<Trash2 className="size-3.5" />}
                            />
                        </div>
                    )}
                </header>

                {isIncompleteStatusChange && (
                    <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger-ink">
                        <FileWarning className="size-3.5" />
                        Відсутній файл або період
                    </p>
                )}

                {/* Status change: previous → new */}
                {isStatusChange && (
                    <div className="mt-3 space-y-2">
                        {(prevStatus || newStatus) && (
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={prevStatus} className="opacity-75" />
                                <ArrowRight className="size-4 shrink-0 text-ink-3" />
                                <StatusBadge status={newStatus} />
                            </div>
                        )}
                        {!prevStatus && !newStatus && description && (
                            <p className="whitespace-pre-line text-sm text-ink-2">{description}</p>
                        )}
                        {statusNote && (prevStatus || newStatus) && (
                            <p className="whitespace-pre-line text-sm text-ink-2">{statusNote}</p>
                        )}
                    </div>
                )}

                {/* Position change: was → became */}
                {isPosadaChange && (
                    <div className="mt-3">
                        {oldPosada && newPosada ? (
                            <div className="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr]">
                                <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
                                    <p className="text-[11px] uppercase tracking-wider text-ink-3">
                                        Було
                                    </p>
                                    <p className="text-sm font-medium text-ink">{oldPosada}</p>
                                </div>
                                <ArrowRight className="hidden size-4 self-center text-ink-3 sm:block" />
                                <div
                                    className={cn(
                                        'rounded-lg border px-3 py-2',
                                        newPosada === '— (прибрано)'
                                            ? 'border-danger-line bg-danger-soft'
                                            : 'border-success-line bg-success-soft',
                                    )}
                                >
                                    <p
                                        className={cn(
                                            'text-[11px] uppercase tracking-wider',
                                            newPosada === '— (прибрано)'
                                                ? 'text-danger-ink'
                                                : 'text-success-ink',
                                        )}
                                    >
                                        Стало
                                    </p>
                                    <p className="text-sm font-medium text-ink">{newPosada}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="rounded-lg border border-success-line bg-success-soft px-3 py-2 text-sm font-medium text-success-ink">
                                {newPosada || description}
                            </p>
                        )}
                    </div>
                )}

                {/* Free text */}
                {!isStatusChange && !isPosadaChange && description && (
                    <div className="mt-2.5">
                        <p
                            className={cn(
                                'whitespace-pre-line text-sm leading-relaxed text-ink-2',
                                longText && !showFullDesc && 'line-clamp-4',
                            )}
                        >
                            {description}
                        </p>
                        {longText && (
                            <button
                                onClick={() => setShowFullDesc(!showFullDesc)}
                                className="mt-1 text-[13px] font-medium text-primary-ink hover:underline"
                            >
                                {showFullDesc ? 'Згорнути' : 'Показати повністю'}
                            </button>
                        )}
                    </div>
                )}

                {typeNote && entry.content && (
                    <p className="mt-2 whitespace-pre-line text-sm text-ink-2">{entry.content}</p>
                )}

                {/* Attachments */}
                {entry.files?.length > 0 && (
                    <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
                        {entry.files.map((file, i) => {
                            const isImage = Boolean(
                                file.dataUrl && file.type?.startsWith('image/'),
                            );
                            return (
                                <li
                                    key={i}
                                    className="group/file overflow-hidden rounded-lg border border-line bg-surface-2"
                                >
                                    <button
                                        onClick={() => void handlePreviewFile(file)}
                                        className="block w-full text-left"
                                        title="Переглянути"
                                    >
                                        {isImage ? (
                                            <img
                                                src={file.dataUrl}
                                                alt={file.name}
                                                className="h-24 w-full object-cover transition-transform duration-300 group-hover/file:scale-[1.03]"
                                            />
                                        ) : (
                                            <span className="flex h-24 flex-col items-center justify-center gap-1.5 px-2 text-center">
                                                <FileText className="size-6 text-ink-3" />
                                                <span className="line-clamp-2 break-all text-xs text-ink-2">
                                                    {file.name}
                                                </span>
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => void handleDownload(file)}
                                        className="flex w-full items-center justify-center gap-1.5 border-t border-line py-1.5 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
                                    >
                                        <Download className="size-3.5" />
                                        Завантажити
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* Period */}
                {entry.period && (entry.period.from || entry.period.to) && (
                    <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[13px] text-ink-2">
                        <CalendarRange className="size-4 text-ink-3" />
                        <span className="font-medium text-ink">
                            {entry.period.from ? formatDate(entry.period.from) : '…'}
                            {entry.period.to ? ` — ${formatDate(entry.period.to)}` : ''}
                        </span>
                    </p>
                )}
            </article>
        </li>
    );
}
