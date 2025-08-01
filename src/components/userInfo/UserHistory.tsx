import { useState, useMemo, useRef } from 'react';
import type { CommentOrHistoryEntry } from '../../types/user';
import HistoryItem from './HistoryItem';
import AddHistoryModal from './AddHistoryModal';
import { useI18nStore } from '../../stores/i18nStore';
import { HistoryHeader } from '../HistoryHeader';
import { StatusExcel } from '../../utils/excelUserStatuses';
import { useUserStore } from '../../stores/userStore';
import { VariableSizeList as List } from 'react-window';
import FilePreviewModal from '../../components/FilePreviewModal';

// Type for preview file UI
type FileWithDataUrl = { name: string; type: string; dataUrl: string };

type UserHistoryProps = {
    history: CommentOrHistoryEntry[];
    userId: number;
    onAddHistory: (entry: CommentOrHistoryEntry, maybeNewStatus?: StatusExcel) => void;
    onDeleteHistory: (id: number) => void;
    onStatusChange: (status: StatusExcel) => void;
    currentStatus?: string;
    refreshHistory: () => void;
};

export default function UserHistory({
    history,
    userId,
    onAddHistory,
    onDeleteHistory,
    onStatusChange,
    currentStatus,
    refreshHistory,
}: UserHistoryProps) {
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<FileWithDataUrl[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<CommentOrHistoryEntry | null>(null);
    const [initialPeriod, setInitialPeriod] = useState<{ from: string; to: string } | undefined>();
    const [previewFile, setPreviewFile] = useState<FileWithDataUrl | null>(null);

    const user = useUserStore((s) => s.users.find((u) => u.id === userId));
    const isExcluded = user?.shpkNumber === 'excluded';

    const { t } = useI18nStore();

    const filteredHistory = useMemo(() => {
        const sorted = [...history].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        if (!searchTerm.trim()) return sorted;

        const term = searchTerm.toLowerCase();

        return sorted.filter((entry) => {
            const matchesBasicFields =
                [entry.description, entry.author, new Date(entry.date).toLocaleDateString()].some(
                    (f) => f?.toLowerCase().includes(term),
                ) || entry.files?.some((file) => file.name.toLowerCase().includes(term));

            const isIncomplete =
                entry.type === 'statusChange' &&
                (!entry.period || !entry.files || entry.files.length === 0);

            const matchesMissingHint =
                isIncomplete && ['відсутній', 'файл', 'період'].some((w) => w.startsWith(term));

            return matchesBasicFields || matchesMissingHint;
        });
    }, [history, searchTerm]);

    const openAddModal = () => {
        setEditingEntry(null);
        setDescription('');
        setFiles([]);
        setInitialPeriod(undefined);
        setIsModalOpen(true);
    };

    const openEditModal = (entry: CommentOrHistoryEntry) => {
        setEditingEntry(entry);
        setDescription(entry.description || '');
        setFiles(entry.files || []);
        setInitialPeriod(entry.period);
        setIsModalOpen(true);
    };

    const handleSaveHistory = async (
        desc: string,
        attachedFiles: FileWithDataUrl[],
        maybeNewStatus?: StatusExcel,
        period?: { from: string; to: string },
    ) => {
        const newFiles = attachedFiles.filter((f) => !!f.dataUrl);

        if (newFiles.length !== attachedFiles.length) {
            console.warn('⚠️ Some files were missing dataUrl and skipped.');
        }

        if (editingEntry) {
            const existingFiles = editingEntry.files || [];

            // ✅ Only retain files that still exist in modal's `attachedFiles`
            const retainedMeta = existingFiles.filter((oldFile) =>
                attachedFiles.some((f) => f.name === oldFile.name && !f.dataUrl),
            );

            const retained: FileWithDataUrl[] = await Promise.all(
                retainedMeta.map(async (f) => {
                    try {
                        const loaded = await window.electronAPI.loadHistoryFile(
                            userId,
                            editingEntry.id,
                            f.name,
                        );
                        return {
                            ...f,
                            dataUrl: loaded.dataUrl,
                        };
                    } catch (err) {
                        console.warn(`❌ Failed to reload file "${f.name}"`, err);
                        return null;
                    }
                }),
            ).then((results) => results.filter(Boolean) as FileWithDataUrl[]);

            const mergedFiles = [...retained, ...newFiles];

            const updated: CommentOrHistoryEntry = {
                ...editingEntry,
                description: desc.trim(),
                files: mergedFiles,
                type: maybeNewStatus ? 'statusChange' : editingEntry.type,
                period: period || undefined,
            };

            await window.electronAPI.editUserHistory(userId, updated);
            if (refreshHistory) refreshHistory();
        } else {
            const prevStatus = currentStatus || '—';
            const statusInfo =
                maybeNewStatus && maybeNewStatus !== prevStatus
                    ? `✅ Статус змінено з "${prevStatus}" → "${maybeNewStatus}"`
                    : '';
            const combinedDescription = [statusInfo, desc.trim()].filter(Boolean).join('\n');

            const newEntry: CommentOrHistoryEntry = {
                id: Date.now(),
                date: new Date().toISOString(),
                type: maybeNewStatus ? 'statusChange' : 'history',
                author: 'You',
                description: combinedDescription,
                content: '',
                files: newFiles,
                period: period || undefined,
            };

            onAddHistory(newEntry, maybeNewStatus);
        }

        setIsModalOpen(false);
        setEditingEntry(null);
        setDescription('');
        setFiles([]);
    };

    // 🧠 Dynamic size logic
    const listRef = useRef<any>(null);
    const sizeMap = useRef<{ [index: number]: number }>({});
    const getItemSize = (index: number) => sizeMap.current[index] || 300;
    const setSize = (index: number, size: number) => {
        if (sizeMap.current[index] !== size) {
            sizeMap.current = { ...sizeMap.current, [index]: size };
            listRef.current?.resetAfterIndex(index);
        }
    };

    return (
        <div className="relative">
            <HistoryHeader
                onAddHistory={!isExcluded ? openAddModal : undefined}
                currentStatus={!isExcluded ? currentStatus : undefined}
                onStatusChange={!isExcluded ? onStatusChange : undefined}
                isExcluded={isExcluded}
            />

            <div className="flex justify-end mb-4">
                <input
                    type="text"
                    placeholder={t('history.searchPlaceholder')}
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            {previewFile && (
                <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
            )}

            {filteredHistory.length === 0 ? (
                <p className="text-gray-500 italic">{t('history.noRecords')}</p>
            ) : (
                <div className="space-y-6 px-4 pb-8">
                    {filteredHistory.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4"
                        >
                            <HistoryItem
                                entry={item}
                                userId={user!.id}
                                onDelete={onDeleteHistory}
                                onEdit={openEditModal}
                                onPreviewFile={(file) => setPreviewFile(file)}
                            />
                        </div>
                    ))}
                </div>

                // <List
                //     ref={listRef}
                //     height={window.innerHeight * 0.8}
                //     width="100%"
                //     itemCount={filteredHistory.length}
                //     itemSize={getItemSize}
                //     className="overflow-x-hidden"
                // >
                //     {({ index, style }) => {
                //         const item = filteredHistory[index];
                //         const refCallback = (el: HTMLDivElement | null) => {
                //             if (el) {
                //                 const height = el.getBoundingClientRect().height;
                //                 setSize(index, height);
                //             }
                //         };

                //         return (
                //             <div
                //                 style={{
                //                     ...style,
                //                     top: `${parseFloat(style.top as string) + 16}px`, // vertical spacing between items
                //                     paddingLeft: '16px',
                //                     paddingRight: '16px',
                //                 }}
                //                 ref={refCallback}
                //             >
                //                 <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
                //                     <HistoryItem
                //                         key={item.id}
                //                         entry={item}
                //                         userId={user!.id}
                //                         onDelete={onDeleteHistory}
                //                         onEdit={openEditModal}
                //                         onPreviewFile={(file) => setPreviewFile(file)}
                //                     />
                //                 </div>
                //             </div>
                //         );
                //     }}
                // </List>
            )}

            <AddHistoryModal
                isOpen={isModalOpen && !isExcluded}
                currentStatus={currentStatus}
                onClose={() => setIsModalOpen(false)}
                description={description}
                setDescription={setDescription}
                files={files}
                initialPeriod={initialPeriod}
                setFiles={setFiles}
                removeFile={(idx) => setFiles((f) => f.filter((_, i) => i !== idx))}
                onSubmit={handleSaveHistory}
                onFileChange={(e) => {
                    if (!e.target.files) return;
                    Array.from(e.target.files).forEach((file) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            if (typeof reader.result === 'string') {
                                setFiles((prev) => [
                                    ...prev,
                                    {
                                        name: file.name,
                                        type: file.type,
                                        dataUrl: reader.result as string,
                                    },
                                ]);
                            }
                        };
                        reader.readAsDataURL(file);
                    });
                    e.target.value = '';
                }}
            />
        </div>
    );
}
