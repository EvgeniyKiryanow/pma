import { UserCheck } from 'lucide-react';
import { useState } from 'react';

import type { CommentOrHistoryEntry } from '../../../../shared/types/user';
import { historyApi } from '../../../shared/api/personnel';
import AttachmentPicker from '../../../shared/components/AttachmentPicker';
import { FileWithDataUrl } from '../../../shared/components/FilePreviewModal';
import { Alert, Button, FieldShell, Modal } from '../../../shared/ui';
import { toast } from '../../../shared/ui/toast';
import { useUserStore } from '../../../stores/userStore';
import { useVidnovlennyaStore } from '../model/useVidnovlennyaStore';

export default function VidnovytyModal({ onClose }: { onClose: () => void }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [periodFrom, setPeriodFrom] = useState('');
    const [file, setFile] = useState<FileWithDataUrl | null>(null);
    const [busy, setBusy] = useState(false);
    const user = useUserStore((s) => s.selectedUser);
    const updateUser = useUserStore((s) => s.updateUser);
    const refreshAfterChange = useUserStore((s) => s.refreshAfterChange);
    const addVidnovlennya = useVidnovlennyaStore((s) => s.addVidnovlennya);

    const handleSubmit = async () => {
        if (!title || !file || !periodFrom || !user) return;
        setBusy(true);
        try {
            // 1. The restoration record
            await addVidnovlennya({
                userId: user.id,
                title,
                description,
                period: { from: periodFrom },
                file,
                date: new Date().toISOString(),
            });

            // 2. Entry in the person's history
            const historyEntry: CommentOrHistoryEntry = {
                id: Date.now(),
                type: 'restore',
                date: new Date().toISOString(),
                author: 'System',
                description: `Відновлено користувача: ${title}`,
                content: description,
                files: [file],
                period: { from: periodFrom, to: periodFrom },
            };

            await historyApi.add(user.id, historyEntry);
            await updateUser({
                ...user,
                shpkNumber: String(user.shpkNumber || '').replace(/_(order|excluded)$/, ''),
            });
            await refreshAfterChange();
            toast.success('Військовослужбовця відновлено');
            onClose();
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Відновити військовослужбовця"
            description={user?.fullName}
            icon={<UserCheck />}
            width="max-w-xl"
            closeOnBackdrop={false}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Скасувати
                    </Button>
                    <Button
                        onClick={() => void handleSubmit()}
                        disabled={!title || !file || !periodFrom}
                        loading={busy}
                        icon={<UserCheck className="size-4" />}
                    >
                        Підтвердити відновлення
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <Alert tone="success">
                    Після відновлення військовослужбовця буде{' '}
                    <strong>повернено до розрахунку</strong> БЧС та всіх активних звітів. Перед
                    підтвердженням <strong>перевірте дані</strong>: посаду, звання, статус.
                </Alert>

                <FieldShell label="Заголовок" htmlFor="restore-title" required>
                    <input
                        id="restore-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="field"
                        placeholder="Наприклад: Повернення з розпорядження"
                        autoFocus
                    />
                </FieldShell>

                <FieldShell label="Опис" htmlFor="restore-description">
                    <textarea
                        id="restore-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="field"
                        rows={3}
                        placeholder="Додатковий опис (необовʼязково)"
                    />
                </FieldShell>

                <FieldShell label="Дата відновлення" htmlFor="restore-date" required>
                    <input
                        id="restore-date"
                        type="date"
                        value={periodFrom}
                        onChange={(e) => setPeriodFrom(e.target.value)}
                        className="field"
                    />
                </FieldShell>

                <FieldShell label="Підтверджуючий файл" required>
                    <AttachmentPicker file={file} onChange={setFile} />
                </FieldShell>
            </div>
        </Modal>
    );
}
