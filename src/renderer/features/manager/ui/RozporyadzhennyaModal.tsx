import { Send } from 'lucide-react';
import { useState } from 'react';

import { CommentOrHistoryEntry } from '../../../../shared/types/user';
import AttachmentPicker from '../../../shared/components/AttachmentPicker';
import { FileWithDataUrl } from '../../../shared/components/FilePreviewModal';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Alert, Button, FieldShell, Modal } from '../../../shared/ui';
import { toast } from '../../../shared/ui/toast';
import { useUserStore } from '../../../stores/userStore';
import { useRozporyadzhennyaStore } from '../model/useRozporyadzhennyaStore';

export default function RozporyadzhennyaModal({ onClose }: { onClose: () => void }) {
    const user = useUserStore((s) => s.selectedUser);
    const updateUser = useUserStore((s) => s.updateUser);
    const refreshAfterChange = useUserStore((s) => s.refreshAfterChange);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [period, setPeriod] = useState({ from: '', to: '' });
    const [file, setFile] = useState<FileWithDataUrl | null>(null);
    const [busy, setBusy] = useState(false);
    const addRozporyadzhennya = useRozporyadzhennyaStore((s) => s.addEntry);

    const ready = Boolean(title && period.from && file);

    const handleSubmit = async () => {
        if (!title || !period.from || !file || !user) return;
        setBusy(true);
        try {
            const now = new Date().toISOString();

            // 1. The order itself
            await addRozporyadzhennya({
                userId: user.id,
                title,
                description,
                period,
                file,
                date: now,
            });

            // 2. Entry in the person's history
            const historyEntry: CommentOrHistoryEntry = {
                id: Date.now(),
                type: 'order',
                date: now,
                author: 'System',
                description: `Подано розпорядження: ${title}`,
                content: description,
                files: [file],
                period,
            };

            await window.electronAPI.addUserHistory(user.id, historyEntry);
            await updateUser({
                ...user,
                shpkNumber: user.shpkNumber ? `${user.shpkNumber}_order` : 'order',
            });
            await refreshAfterChange();
            toast.success('Розпорядження подано');
            onClose();
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Подати розпорядження"
            description={user?.fullName}
            icon={<Send />}
            width="max-w-xl"
            closeOnBackdrop={false}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Скасувати
                    </Button>
                    <Button
                        onClick={() => void handleSubmit()}
                        disabled={!ready}
                        loading={busy}
                        icon={<Send className="size-4" />}
                    >
                        Вивести в розпорядження
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <Alert tone="warning">
                    Після подачі розпорядження військовослужбовець{' '}
                    <strong>виключається з підрахунку БЧС</strong>. Додайте файл з підтвердженням
                    або наказом.
                </Alert>

                {user?.soldierStatus && (
                    <div className="flex items-center gap-2 text-[13px] text-ink-3">
                        Поточний статус: <StatusBadge status={user.soldierStatus} />
                    </div>
                )}

                <FieldShell label="Заголовок" htmlFor="order-title" required>
                    <input
                        id="order-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="field"
                        placeholder="Наприклад: Розпорядження № 123"
                        autoFocus
                    />
                </FieldShell>

                <FieldShell label="Опис" htmlFor="order-description">
                    <textarea
                        id="order-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="field"
                        rows={3}
                        placeholder="Додатковий опис (необовʼязково)"
                    />
                </FieldShell>

                <div className="grid gap-4 sm:grid-cols-2">
                    <FieldShell label="Період: з" htmlFor="order-from" required>
                        <input
                            id="order-from"
                            type="date"
                            value={period.from}
                            onChange={(e) => setPeriod({ ...period, from: e.target.value })}
                            className="field"
                        />
                    </FieldShell>
                    <FieldShell label="по" htmlFor="order-to">
                        <input
                            id="order-to"
                            type="date"
                            value={period.to}
                            onChange={(e) => setPeriod({ ...period, to: e.target.value })}
                            className="field"
                        />
                    </FieldShell>
                </div>

                <FieldShell label="Файл підтвердження" required>
                    <AttachmentPicker file={file} onChange={setFile} />
                </FieldShell>
            </div>
        </Modal>
    );
}
