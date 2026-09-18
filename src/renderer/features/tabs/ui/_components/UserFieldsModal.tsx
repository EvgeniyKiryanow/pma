import { ClipboardCopy, ListChecks } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { User } from '../../../../../shared/types/user';
import { Button, cn, EmptyState, Modal, SearchInput } from '../../../../shared/ui';
import { toast } from '../../../../shared/ui/toast';
import { getFieldLabel } from '../../../../shared/utils/headerMap';

type UserModalConfig = {
    user: User | null | undefined;
    includedFields?: Record<string, boolean>;
    setIncludedFields?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
};

type Props = {
    open: boolean;
    onClose: () => void;
    usersConfig: UserModalConfig[];
};

/** Choose which fields fill the template; click a value to copy it. */
export default function UserDataCombinedModal({ open, onClose, usersConfig }: Props) {
    const [activeTab, setActiveTab] = useState(0);
    const [search, setSearch] = useState('');

    const config = usersConfig[activeTab] ?? usersConfig[0];
    const user = config?.user;
    const includedFields = config?.includedFields;
    const setIncludedFields = config?.setIncludedFields;

    const availableFields = useMemo(() => {
        if (!user) return [];
        const keys = includedFields ? Object.keys(includedFields) : Object.keys(user);
        return keys.filter((field) => {
            const value = user?.[field as keyof User];
            return (
                value !== null &&
                value !== undefined &&
                (typeof value !== 'string' || value.trim() !== '') &&
                (!Array.isArray(value) || value.length > 0)
            );
        });
    }, [user, includedFields]);

    const filteredFields = useMemo(() => {
        const q = search.toLowerCase();
        return availableFields.filter((field) => {
            const label = getFieldLabel(field).toLowerCase();
            const value = String(user?.[field as keyof User] || '').toLowerCase();
            return label.includes(q) || value.includes(q);
        });
    }, [search, availableFields, user]);

    if (!open || usersConfig.length === 0) return null;

    const handleCopy = (val: string) => {
        void navigator.clipboard.writeText(val);
        toast.success('Значення скопійовано');
    };

    const handleToggleAll = (checked: boolean) => {
        if (!includedFields || !setIncludedFields) return;
        const updated: Record<string, boolean> = { ...includedFields };
        filteredFields.forEach((field) => {
            updated[field] = checked;
        });
        setIncludedFields(updated);
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Поля для шаблону"
            description="Оберіть поля, що підставляються в документ. Натисніть на значення, щоб скопіювати його."
            icon={<ListChecks />}
            width="max-w-3xl"
            footer={<Button onClick={onClose}>Готово</Button>}
        >
            {usersConfig.length > 1 && (
                <div className="mb-4 flex gap-1 rounded-xl border border-line bg-surface-2 p-0.5">
                    {usersConfig.map((uc, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveTab(idx)}
                            className={cn(
                                'h-8 flex-1 rounded-[10px] text-[13px] font-medium transition-colors',
                                activeTab === idx
                                    ? 'bg-surface text-ink shadow-card'
                                    : 'text-ink-3 hover:text-ink',
                            )}
                        >
                            {uc.user?.fullName || `Військовослужбовець ${idx + 1}`}
                        </button>
                    ))}
                </div>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Пошук поля або значення…"
                    size="sm"
                    className="min-w-[220px] flex-1"
                />
                {includedFields && setIncludedFields && (
                    <>
                        <Button variant="secondary" size="sm" onClick={() => handleToggleAll(true)}>
                            Обрати всі
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleAll(false)}>
                            Зняти всі
                        </Button>
                    </>
                )}
            </div>

            {filteredFields.length === 0 ? (
                <EmptyState title="Немає даних" />
            ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {filteredFields.map((field) => {
                        const label = getFieldLabel(field);
                        const value = String(user?.[field as keyof User] || '');
                        return (
                            <div
                                key={field}
                                className="group flex items-start gap-2.5 rounded-xl border border-line p-3 transition-colors hover:bg-surface-2"
                            >
                                {includedFields && setIncludedFields && (
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 size-4 shrink-0"
                                        checked={includedFields?.[field] || false}
                                        onChange={() =>
                                            setIncludedFields?.((prev) => ({
                                                ...prev,
                                                [field]: !prev[field],
                                            }))
                                        }
                                    />
                                )}
                                <button
                                    onClick={() => handleCopy(value)}
                                    className="min-w-0 flex-1 text-left"
                                    title="Натисніть, щоб скопіювати"
                                >
                                    <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-3">
                                        {label}
                                        <ClipboardCopy className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                                    </span>
                                    <span className="mt-0.5 block break-words text-sm text-ink">
                                        {value}
                                    </span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
}
