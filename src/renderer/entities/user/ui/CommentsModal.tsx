import { FileText, MessageSquareText, Paperclip, Send, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { CommentOrHistoryEntry } from '../../../../shared/types/user';
import { reportError } from '../../../shared/api/errors';
import { commentsApi } from '../../../shared/api/personnel';
import { downloadFile } from '../../../shared/lib/download';
import { pickFiles, readAsDataUrl } from '../../../shared/lib/pickFiles';
import { Avatar, Button, EmptyState, IconButton, Modal, SearchInput } from '../../../shared/ui';
import { confirmAction } from '../../../shared/ui/confirm';
import { useI18nStore } from '../../../stores/i18nStore';
import { usePermissions } from '../../../stores/sessionStore';
import { useUserStore } from '../../../stores/userStore';

type CommentsModalProps = {
    onClose: () => void;
    userId: any;
};

type UploadedFile = {
    name: string;
    type: string;
    dataUrl?: string;
};

export default function CommentsModal({ userId, onClose }: CommentsModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [newComment, setNewComment] = useState('');
    const [author, setAuthor] = useState('');
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [comments, setComments] = useState<CommentOrHistoryEntry[]>([]);
    const selectedUser = useUserStore((s) => s.selectedUser);
    const { t } = useI18nStore();
    const { can } = usePermissions();
    const canWrite = can('history.edit');

    useEffect(() => {
        const fetch = async () => {
            const res = await commentsApi.list(userId);
            setComments(res);
        };
        void fetch();
    }, [userId]);

    const filteredComments = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        const sorted = [...comments].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        if (!term) return sorted;

        return sorted.filter((c) => {
            const authorMatch = c.author?.toLowerCase().includes(term);
            const contentMatch = c.content?.toLowerCase().includes(term);
            const fileMatch = c.files?.some((f) => f.name.toLowerCase().includes(term)) ?? false;

            return authorMatch || contentMatch || fileMatch;
        });
    }, [comments, searchTerm]);

    const handleAddComment = async () => {
        if (!newComment.trim() || !selectedUser) return;

        const newEntry: CommentOrHistoryEntry = {
            id: Date.now(),
            content: newComment.trim(),
            author: author || t('comments.anonymous'),
            date: new Date().toISOString(),
            files,
            type: 'text',
        };

        await commentsApi.add(userId, newEntry);
        setComments((prev) => [...prev, newEntry]);
        setNewComment('');
        setAuthor('');
        setFiles([]);
    };

    const handleDeleteComment = async (id: number) => {
        const confirmed = await confirmAction({
            title: 'Видалити коментар?',
            message: t('comments.deleteConfirm'),
            confirmLabel: t('common.delete'),
            tone: 'danger',
        });
        if (!confirmed) return;

        await commentsApi.remove(id);
        setComments((prev) => prev.filter((c) => c.id !== id));
    };

    // Images and PDFs only (the dialog offers nothing else); stored with the comment.
    const attachFiles = async () => {
        try {
            const picked = await pickFiles('comment-files', { multiple: true });
            const read = await Promise.all(
                picked.map(async (file) => ({
                    name: file.name,
                    type: file.type,
                    dataUrl: await readAsDataUrl(file),
                })),
            );
            setFiles((prev) => [...prev, ...read]);
        } catch (err) {
            reportError(err, { context: 'comment-attach' });
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={t('comments.title')}
            description={selectedUser?.fullName}
            icon={<MessageSquareText />}
            width="max-w-2xl"
            bodyClassName="p-0"
        >
            {canWrite && (
                <div className="space-y-3 border-b border-line bg-surface-2 px-5 py-4">
                    <input
                        className="field"
                        placeholder={t('comments.authorPlaceholder')}
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                    />
                    <textarea
                        className="field"
                        rows={3}
                        placeholder={t('comments.textPlaceholder')}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                    />

                    {files.length > 0 && (
                        <ul className="flex flex-wrap gap-2">
                            {files.map((file, i) => (
                                <li
                                    key={i}
                                    className="flex items-center gap-2 rounded-lg border border-line bg-surface py-1 pl-1 pr-1.5 text-xs text-ink-2"
                                >
                                    {file.dataUrl && file.type !== 'application/pdf' ? (
                                        <img
                                            src={file.dataUrl}
                                            alt=""
                                            className="size-7 rounded object-cover"
                                            draggable={false}
                                        />
                                    ) : (
                                        <span className="grid size-7 place-items-center rounded bg-surface-3">
                                            <FileText className="size-3.5" />
                                        </span>
                                    )}
                                    <span className="max-w-[160px] truncate">{file.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(i)}
                                        className="grid size-5 place-items-center rounded text-ink-3 hover:bg-danger-soft hover:text-danger-ink"
                                        title={t('comments.removeFile')}
                                    >
                                        <X className="size-3" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => void attachFiles()}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
                        >
                            <Paperclip className="size-4" />
                            {t('comments.selectFiles')}
                        </button>
                        <Button
                            size="sm"
                            icon={<Send className="size-3.5" />}
                            disabled={!newComment.trim()}
                            onClick={() => void handleAddComment()}
                        >
                            {t('comments.add')}
                        </Button>
                    </div>
                </div>
            )}

            <div className="px-5 py-4">
                {comments.length > 0 && (
                    <SearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder={t('comments.search')}
                        size="sm"
                        className="mb-4"
                    />
                )}

                {filteredComments.length === 0 ? (
                    <EmptyState icon={<MessageSquareText />} title={t('comments.none')} />
                ) : (
                    <ul className="space-y-3">
                        {filteredComments.map((c) => (
                            <li key={c.id} className="group flex gap-3">
                                <Avatar name={c.author || '?'} size={32} />
                                <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm border border-line bg-surface px-3.5 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate text-[13px] font-semibold text-ink">
                                            {c.author || t('comments.anonymous')}
                                        </span>
                                        <span className="text-xs text-ink-3">
                                            {new Date(c.date).toLocaleString('uk-UA', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            })}
                                        </span>
                                        {canWrite && (
                                            <IconButton
                                                label={t('comments.delete')}
                                                size="xs"
                                                className="ml-auto hover:bg-danger-soft hover:text-danger-ink"
                                                onClick={() => void handleDeleteComment(c.id)}
                                                icon={<Trash2 className="size-3.5" />}
                                            />
                                        )}
                                    </div>
                                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-2">
                                        {c.content}
                                    </p>

                                    {c.files && c.files.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {c.files.map((file, i) =>
                                                file.dataUrl ? (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() =>
                                                            void downloadFile(
                                                                file.dataUrl,
                                                                file.name,
                                                            )
                                                        }
                                                        title={`Зберегти ${file.name}`}
                                                        className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 py-1 pl-1 pr-2 text-xs text-ink-2 hover:border-line-strong hover:text-ink"
                                                    >
                                                        {file.type === 'application/pdf' ? (
                                                            <span className="grid size-8 place-items-center rounded bg-surface-3">
                                                                <FileText className="size-4" />
                                                            </span>
                                                        ) : (
                                                            <img
                                                                src={file.dataUrl}
                                                                alt=""
                                                                className="size-8 rounded object-cover"
                                                            />
                                                        )}
                                                        <span className="max-w-[140px] truncate">
                                                            {file.name}
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <span
                                                        key={i}
                                                        className="rounded-lg border border-line px-2 py-1 text-xs text-ink-3"
                                                    >
                                                        {file.name}
                                                    </span>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Modal>
    );
}
