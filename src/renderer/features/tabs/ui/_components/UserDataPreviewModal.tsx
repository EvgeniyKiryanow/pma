import { ClipboardCopy, IdCard } from 'lucide-react';
import { useState } from 'react';

import { filesApi } from '../../../../shared/api/files';
import { Button, EmptyState, Modal, SearchInput } from '../../../../shared/ui';
import { toast } from '../../../../shared/ui/toast';
import { getFieldLabel } from '../../../../shared/utils/headerMap';

export default function UserDataPreviewModal({
    open,
    onClose,
    user,
}: {
    open: boolean;
    onClose: () => void;
    user: any;
}) {
    const [search, setSearch] = useState('');

    if (!open || !user) return null;

    const filteredFields = Object.entries(user)
        .filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '')
        .filter(([key, val]) => {
            const query = search.toLowerCase();
            return (
                getFieldLabel(key).toLowerCase().includes(query) ||
                String(val).toLowerCase().includes(query)
            );
        });

    const handleCopy = (val: string) => {
        void filesApi.copyText(val);
        toast.success('Значення скопійовано');
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Дані військовослужбовця"
            description="Натисніть на значення, щоб скопіювати його"
            icon={<IdCard />}
            width="max-w-3xl"
            footer={
                <Button variant="secondary" onClick={onClose}>
                    Закрити
                </Button>
            }
        >
            <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Пошук поля або значення…"
                size="sm"
                className="mb-4"
            />
            {filteredFields.length === 0 ? (
                <EmptyState title="Немає даних для відображення" />
            ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {filteredFields.map(([key, val]) => (
                        <button
                            key={key}
                            onClick={() => handleCopy(String(val))}
                            className="group rounded-xl border border-line p-3 text-left transition-colors hover:bg-surface-2"
                            title="Натисніть, щоб скопіювати"
                        >
                            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-3">
                                {getFieldLabel(key)}
                                <ClipboardCopy className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                            </span>
                            <span className="mt-0.5 block break-words text-sm text-ink">
                                {String(val)}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </Modal>
    );
}
