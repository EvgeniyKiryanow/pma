import {
    Check,
    Download,
    Eye,
    FileText,
    FolderOpen,
    FolderPlus,
    MessageSquareText,
    Pencil,
    Trash2,
    UploadCloud,
    X,
} from 'lucide-react';
import { type DragEvent, useCallback, useEffect, useMemo, useState } from 'react';

import type { DocumentCategory, PersonDocument } from '../../../../shared/types/documents';
import { ApiError } from '../../../shared/api/call';
import { documentsApi } from '../../../shared/api/documents';
import { reportError } from '../../../shared/api/errors';
import FilePreviewModal, {
    type FileWithDataUrl,
} from '../../../shared/components/FilePreviewModal';
import { downloadFile } from '../../../shared/lib/download';
import { pickFiles, readAsDataUrl } from '../../../shared/lib/pickFiles';
import {
    Button,
    cn,
    EmptyState,
    formatBytes,
    IconButton,
    Modal,
    SearchInput,
} from '../../../shared/ui';
import { confirmAction } from '../../../shared/ui/confirm';
import { toast } from '../../../shared/ui/toast';
import { useI18nStore } from '../../../stores/i18nStore';
import { usePermissions } from '../../../stores/sessionStore';
import CommentsModal from './CommentsModal';

const MAX_BYTES = 50 * 1024 * 1024;
/** The virtual category of documents without one. */
const NONE = '__none__';
const ALL = '__all__';

function dataUrlToBuffer(dataUrl: string): ArrayBuffer {
    const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

/**
 * «Документи» of a person: files sorted into categories the unit creates (паспорт, накази,
 * медичні…). Drop files in, open, move to another category, rename, delete. The old
 * comments stay reachable from here.
 */
export default function DocumentsModal({
    userId,
    userName,
    onClose,
}: {
    userId: number;
    userName: string;
    onClose: () => void;
}) {
    const { t } = useI18nStore();
    const { can } = usePermissions();
    const canEdit = can('personnel.edit');
    const [categories, setCategories] = useState<DocumentCategory[]>([]);
    const [documents, setDocuments] = useState<PersonDocument[]>([]);
    const [active, setActive] = useState<string>(ALL);
    const [query, setQuery] = useState('');
    const [busy, setBusy] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [preview, setPreview] = useState<FileWithDataUrl | null>(null);
    const [renaming, setRenaming] = useState<{ uuid: string; name: string } | null>(null);
    const [newCategory, setNewCategory] = useState<string | null>(null);
    const [showComments, setShowComments] = useState(false);
    const [categoryEdit, setCategoryEdit] = useState<{ uuid: string; name: string } | null>(null);

    const reload = useCallback(async () => {
        const [cats, docs] = await Promise.all([
            documentsApi.categories(userId),
            documentsApi.list(userId),
        ]);
        setCategories(cats);
        setDocuments(docs);
    }, [userId]);

    useEffect(() => {
        reload().catch((err) => reportError(err, { context: 'documents.load' }));
    }, [reload]);

    const uncategorized = documents.filter(
        (d) => !d.categoryUuid || !categories.some((c) => c.uuid === d.categoryUuid),
    );
    const shown = useMemo(() => {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        return documents.filter((doc) => {
            if (
                active === NONE &&
                doc.categoryUuid &&
                categories.some((c) => c.uuid === doc.categoryUuid)
            )
                return false;
            if (active !== ALL && active !== NONE && doc.categoryUuid !== active) return false;
            const text = `${doc.name} ${doc.note}`.toLowerCase();
            return words.every((w) => text.includes(w));
        });
    }, [documents, active, query, categories]);
    const categoryName = (uuid: string | null) =>
        categories.find((c) => c.uuid === uuid)?.name ?? t('documents.noCategory');

    const upload = async (files: File[]) => {
        if (!files.length) return;
        const target = active === ALL || active === NONE ? null : active;
        setBusy(true);
        try {
            const ready = [];
            for (const file of files) {
                if (file.size > MAX_BYTES) {
                    toast.warning(t('documents.tooLarge', { name: file.name }));
                    continue;
                }
                ready.push({
                    name: file.name,
                    type: file.type,
                    dataUrl: await readAsDataUrl(file),
                });
            }
            if (!ready.length) return;
            await documentsApi.add({ userId, categoryUuid: target, files: ready });
            toast.success(t('documents.added', { count: ready.length }));
            await reload();
        } catch (err) {
            reportError(err, { context: 'documents.add' });
        } finally {
            setBusy(false);
        }
    };

    const choose = async () => {
        try {
            await upload(await pickFiles('any', { multiple: true }));
        } catch (err) {
            reportError(err, { context: 'documents.pick' });
        }
    };

    const drop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragOver(false);
        if (canEdit) void upload(Array.from(event.dataTransfer.files));
    };

    const open = async (doc: PersonDocument) => {
        try {
            setPreview({
                name: doc.name,
                type: doc.type,
                dataUrl: await documentsApi.load(doc.uuid),
            });
        } catch (err) {
            reportError(err, { context: 'documents.open' });
        }
    };

    const download = async (doc: PersonDocument) => {
        try {
            await downloadFile(dataUrlToBuffer(await documentsApi.load(doc.uuid)), doc.name);
        } catch (err) {
            reportError(err, { context: 'documents.download' });
        }
    };

    const move = async (doc: PersonDocument, categoryUuid: string | null) => {
        try {
            await documentsApi.update(doc.uuid, { categoryUuid });
            await reload();
        } catch (err) {
            reportError(err, { context: 'documents.move' });
        }
    };

    const rename = async () => {
        if (!renaming) return;
        try {
            await documentsApi.update(renaming.uuid, { name: renaming.name });
            setRenaming(null);
            await reload();
        } catch (err) {
            reportError(err, { context: 'documents.rename' });
        }
    };

    const remove = async (doc: PersonDocument) => {
        const ok = await confirmAction({
            title: t('documents.removeTitle'),
            message: t('documents.removeMessage', { name: doc.name }),
            confirmLabel: t('common.delete'),
            tone: 'danger',
        });
        if (!ok) return;
        try {
            await documentsApi.remove(doc.uuid);
            await reload();
        } catch (err) {
            reportError(err, { context: 'documents.remove' });
        }
    };

    const addCategory = async () => {
        const name = newCategory?.trim();
        if (!name) return setNewCategory(null);
        try {
            const created = await documentsApi.addCategory(name);
            setNewCategory(null);
            await reload();
            setActive(created.uuid);
        } catch (err) {
            if (err instanceof ApiError && err.code === 'CONFLICT') {
                toast.warning(t('documents.categoryExists'));
            } else reportError(err, { context: 'documents.category' });
        }
    };

    const renameCategory = async () => {
        const target = categoryEdit;
        setCategoryEdit(null);
        const name = target?.name.trim();
        const current = categories.find((c) => c.uuid === target?.uuid);
        if (!target || !name || name === current?.name) return;
        try {
            await documentsApi.renameCategory(target.uuid, name);
            await reload();
        } catch (err) {
            reportError(err, { context: 'documents.category-rename' });
        }
    };

    const removeCategory = async (category: DocumentCategory) => {
        const ok = await confirmAction({
            title: t('documents.removeCategoryTitle'),
            message: t('documents.removeCategoryMessage', { name: category.name }),
            confirmLabel: t('common.delete'),
            tone: 'danger',
        });
        if (!ok) return;
        try {
            await documentsApi.removeCategory(category.uuid);
            setActive(ALL);
            await reload();
        } catch (err) {
            if (err instanceof ApiError && err.code === 'CONFLICT') {
                toast.warning(
                    t('documents.categoryNotEmpty', { count: Number(err.details?.count ?? 0) }),
                );
            } else reportError(err, { context: 'documents.category-remove' });
        }
    };

    const sideItem = (key: string, label: string, count: number, category?: DocumentCategory) =>
        categoryEdit?.uuid === key ? (
            <li key={key} className="px-1 py-0.5">
                <input
                    autoFocus
                    aria-label={t('documents.renameCategory')}
                    className="field h-8 text-[13px]"
                    value={categoryEdit.name}
                    onChange={(e) => setCategoryEdit({ uuid: key, name: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') void renameCategory();
                        if (e.key === 'Escape') {
                            e.stopPropagation();
                            setCategoryEdit(null);
                        }
                    }}
                    onBlur={() => void renameCategory()}
                />
            </li>
        ) : (
            <li key={key} className="group flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => setActive(key)}
                    className={cn(
                        'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                        active === key
                            ? 'bg-primary-soft font-medium text-primary-ink'
                            : 'text-ink-2 hover:bg-surface-2',
                    )}
                >
                    <FolderOpen className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <span className="font-mono text-[11px] text-ink-3">{count}</span>
                </button>
                {category && canEdit && active === key && (
                    <>
                        <IconButton
                            label={t('documents.renameCategory')}
                            size="xs"
                            variant="ghost"
                            onClick={() =>
                                setCategoryEdit({ uuid: category.uuid, name: category.name })
                            }
                            icon={<Pencil className="size-3.5" />}
                        />
                        <IconButton
                            label={t('documents.removeCategoryTitle')}
                            size="xs"
                            variant="ghost"
                            className="hover:bg-danger-soft hover:text-danger-ink"
                            onClick={() => void removeCategory(category)}
                            icon={<Trash2 className="size-3.5" />}
                        />
                    </>
                )}
            </li>
        );

    return (
        <Modal
            open
            onClose={onClose}
            title={t('documents.title')}
            description={userName}
            icon={<FolderOpen />}
            width="max-w-5xl"
            bodyClassName="p-0 flex min-h-0"
        >
            <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface-2/40">
                <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
                    {sideItem(ALL, t('documents.all'), documents.length)}
                    {categories.map((c) => sideItem(c.uuid, c.name, c.count, c))}
                    {uncategorized.length > 0 &&
                        sideItem(NONE, t('documents.noCategory'), uncategorized.length)}
                </ul>
                <div className="space-y-2 border-t border-line p-2">
                    {canEdit &&
                        (newCategory === null ? (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="w-full justify-start"
                                icon={<FolderPlus className="size-4" />}
                                onClick={() => setNewCategory('')}
                            >
                                {t('documents.addCategory')}
                            </Button>
                        ) : (
                            <div className="flex items-center gap-1">
                                <input
                                    autoFocus
                                    className="field h-8 text-[13px]"
                                    value={newCategory}
                                    placeholder={t('documents.categoryName')}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') void addCategory();
                                        if (e.key === 'Escape') {
                                            e.stopPropagation();
                                            setNewCategory(null);
                                        }
                                    }}
                                />
                                <IconButton
                                    label={t('common.save')}
                                    size="sm"
                                    onClick={() => void addCategory()}
                                    icon={<Check className="size-4" />}
                                />
                                <IconButton
                                    label={t('common.cancel')}
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setNewCategory(null)}
                                    icon={<X className="size-4" />}
                                />
                            </div>
                        ))}
                    <Button
                        size="sm"
                        variant="ghost"
                        className="w-full justify-start"
                        icon={<MessageSquareText className="size-4" />}
                        onClick={() => setShowComments(true)}
                    >
                        {t('documents.comments')}
                    </Button>
                </div>
            </aside>

            <div
                className="flex min-h-[60vh] min-w-0 flex-1 flex-col"
                onDragOver={(e) => {
                    e.preventDefault();
                    if (canEdit) setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={drop}
            >
                <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
                    <SearchInput
                        className="min-w-48 flex-1"
                        value={query}
                        onChange={setQuery}
                        placeholder={t('documents.search')}
                    />
                    {canEdit && (
                        <Button
                            icon={<UploadCloud className="size-4" />}
                            loading={busy}
                            onClick={choose}
                        >
                            {active === ALL || active === NONE
                                ? t('documents.upload')
                                : t('documents.uploadTo', { category: categoryName(active) })}
                        </Button>
                    )}
                </div>

                <div
                    className={cn(
                        'relative min-h-0 flex-1 overflow-y-auto p-4',
                        dragOver && 'bg-primary-soft/40',
                    )}
                >
                    {dragOver && (
                        <div className="pointer-events-none absolute inset-3 z-10 grid place-items-center rounded-2xl border-2 border-dashed border-primary text-sm font-medium text-primary-ink">
                            {t('documents.dropHere')}
                        </div>
                    )}
                    {shown.length === 0 ? (
                        <EmptyState
                            icon={<FileText />}
                            title={documents.length ? t('documents.nothing') : t('documents.empty')}
                            description={canEdit ? t('documents.emptyHint') : undefined}
                        />
                    ) : (
                        <ul className="space-y-2">
                            {shown.map((doc) => (
                                <li
                                    key={doc.uuid}
                                    className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
                                >
                                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-ink">
                                        <FileText className="size-5" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        {renaming?.uuid === doc.uuid ? (
                                            <input
                                                autoFocus
                                                className="field h-8"
                                                value={renaming.name}
                                                onChange={(e) =>
                                                    setRenaming({
                                                        ...renaming,
                                                        name: e.target.value,
                                                    })
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') void rename();
                                                    if (e.key === 'Escape') {
                                                        e.stopPropagation();
                                                        setRenaming(null);
                                                    }
                                                }}
                                                onBlur={() => void rename()}
                                            />
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => void open(doc)}
                                                className="block max-w-full truncate text-left text-sm font-medium text-ink hover:text-primary-ink"
                                                title={doc.name}
                                            >
                                                {doc.name}
                                            </button>
                                        )}
                                        <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink-3">
                                            <span>
                                                {new Date(doc.createdAt).toLocaleDateString(
                                                    'uk-UA',
                                                )}
                                            </span>
                                            {doc.size > 0 && <span>{formatBytes(doc.size)}</span>}
                                            {active === ALL && (
                                                <span>{categoryName(doc.categoryUuid)}</span>
                                            )}
                                        </p>
                                    </div>
                                    {canEdit && (
                                        <select
                                            aria-label={t('documents.moveTo')}
                                            title={t('documents.moveTo')}
                                            className="field h-8 w-44 text-xs"
                                            value={doc.categoryUuid ?? ''}
                                            onChange={(e) => void move(doc, e.target.value || null)}
                                        >
                                            <option value="">{t('documents.noCategory')}</option>
                                            {categories.map((c) => (
                                                <option key={c.uuid} value={c.uuid}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    <span className="flex shrink-0 items-center gap-0.5">
                                        <IconButton
                                            label={t('documents.open')}
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => void open(doc)}
                                            icon={<Eye className="size-4" />}
                                        />
                                        <IconButton
                                            label={t('documents.download')}
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => void download(doc)}
                                            icon={<Download className="size-4" />}
                                        />
                                        {canEdit && (
                                            <>
                                                <IconButton
                                                    label={t('documents.rename')}
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        setRenaming({
                                                            uuid: doc.uuid,
                                                            name: doc.name,
                                                        })
                                                    }
                                                    icon={<Pencil className="size-4" />}
                                                />
                                                <IconButton
                                                    label={t('common.delete')}
                                                    size="sm"
                                                    variant="ghost"
                                                    className="hover:bg-danger-soft hover:text-danger-ink"
                                                    onClick={() => void remove(doc)}
                                                    icon={<Trash2 className="size-4" />}
                                                />
                                            </>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            {preview && <FilePreviewModal file={preview} onClose={() => setPreview(null)} />}
            {showComments && (
                <CommentsModal userId={userId} onClose={() => setShowComments(false)} />
            )}
        </Modal>
    );
}
