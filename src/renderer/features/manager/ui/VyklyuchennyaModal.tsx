import { UserX } from 'lucide-react';
import { useState } from 'react';

import { historyApi } from '../../../shared/api/personnel';
import AttachmentPicker from '../../../shared/components/AttachmentPicker';
import { FileWithDataUrl } from '../../../shared/components/FilePreviewModal';
import { Alert, Button, FieldShell, Modal } from '../../../shared/ui';
import { toast } from '../../../shared/ui/toast';
import { useUserStore } from '../../../stores/userStore';
import { useVyklyuchennyaStore } from '../model/useVyklyuchennyaStore';

export default function VyklyuchennyaModal({ onClose }: { onClose: () => void }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [periodFrom, setPeriodFrom] = useState('');
    const [file, setFile] = useState<FileWithDataUrl | null>(null);
    const [busy, setBusy] = useState(false);

    const user = useUserStore((s) => s.selectedUser);
    const updateUser = useUserStore((s) => s.updateUser);
    const refreshAfterChange = useUserStore((s) => s.refreshAfterChange);
    const addVyklyuchennya = useVyklyuchennyaStore((s) => s.addVyklyuchennya);

    const handleSubmit = async () => {
        if (!title || !file || !periodFrom || !user) return;
        setBusy(true);
        try {
            // 1. The exclusion record
            await addVyklyuchennya({
                userId: user.id,
                title,
                description,
                periodFrom,
                file,
                date: new Date().toISOString(),
            });

            // 2. Entry in the person's history
            await historyApi.add(user.id, {
                id: Date.now(),
                type: 'exclude',
                date: new Date().toISOString(),
                author: 'System',
                description: `Користувача виключено: ${title}`,
                content: description,
                files: [file],
                period: { from: periodFrom, to: periodFrom },
            });
            await updateUser({ ...user, shpkNumber: 'excluded' });
            await refreshAfterChange();
            toast.success('Військовослужбовця виключено');
            onClose();
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Виключити військовослужбовця"
            description={user?.fullName}
            icon={<UserX />}
            width="max-w-xl"
            closeOnBackdrop={false}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Скасувати
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => void handleSubmit()}
                        disabled={!title || !file || !periodFrom}
                        loading={busy}
                        icon={<UserX className="size-4" />}
                    >
                        Підтвердити виключення
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <Alert tone="error">
                    Після підтвердження військовослужбовця буде <strong>повністю виключено</strong>{' '}
                    з усіх списків і розрахунків. Повернути можна лише вручну.
                </Alert>

                <FieldShell label="Заголовок" htmlFor="exclude-title" required>
                    <input
                        id="exclude-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="field"
                        placeholder="Наприклад: Наказ № 45 про виключення"
                        autoFocus
                    />
                </FieldShell>

                <FieldShell label="Опис" htmlFor="exclude-description">
                    <textarea
                        id="exclude-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="field"
                        rows={3}
                        placeholder="Додатковий опис (необовʼязково)"
                    />
                </FieldShell>

                <FieldShell label="Дата виключення" htmlFor="exclude-date" required>
                    <input
                        id="exclude-date"
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
