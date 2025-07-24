/* eslint-disable react-hooks/rules-of-hooks */
import { useState, useMemo } from 'react';
import type { User } from '../../../types/user';
import { X, ClipboardCopy } from 'lucide-react';
import { getFieldLabel } from '../../../utils/headerMap';

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

export default function UserDataCombinedModal({ open, onClose, usersConfig }: Props) {
    const [activeTab, setActiveTab] = useState(0);
    const [search, setSearch] = useState('');

    if (!open || usersConfig.length === 0) return null;

    const { user, includedFields, setIncludedFields } = usersConfig[activeTab];
    const userName = user?.fullName || `Користувач ${activeTab + 1}`;

    const showToast = (msg: string) => {
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.className =
            'fixed bottom-4 right-4 bg-green-600 text-white text-xs px-4 py-2 rounded shadow-md animate-fade-in-out';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1500);
    };

    const handleCopy = (val: string) => {
        navigator.clipboard.writeText(val);
        showToast('✅ Значення скопійовано!');
    };

    // ✅ Collect only non-empty fields
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

    // ✅ Search filter
    const filteredFields = useMemo(() => {
        const q = search.toLowerCase();
        return availableFields.filter((field) => {
            const label = getFieldLabel(field).toLowerCase();
            const value = String(user?.[field as keyof User] || '').toLowerCase();
            return label.includes(q) || value.includes(q);
        });
    }, [search, availableFields, user]);

    // ✅ Select/Unselect all
    const handleToggleAll = (checked: boolean) => {
        if (!includedFields || !setIncludedFields) return;
        const updated: Record<string, boolean> = { ...includedFields };
        filteredFields.forEach((field) => {
            updated[field] = checked;
        });
        setIncludedFields(updated);
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[100vh]">
                {/* HEADER */}
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        ⚙️ Поля користувача + копіювання
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white text-xl hover:scale-110 transition"
                        title="Закрити"
                    >
                        <X />
                    </button>
                </div>

                {/* DESCRIPTION */}
                <div className="px-6 py-3 text-sm text-gray-700 border-b bg-gray-50 leading-relaxed">
                    У цьому вікні ви можете:
                    <ul className="list-disc ml-5 mt-1 space-y-1 text-gray-600">
                        <li>
                            <b>Вибрати, які поля будуть включені в шаблон</b> для автоматичного
                            заповнення.
                        </li>
                        <li>
                            <b>Натискати на будь-яке значення, щоб швидко скопіювати його</b> – це
                            зручно, якщо ви хочете вставити дані в документ вручну.
                        </li>
                    </ul>
                    <div className="mt-2 text-gray-700">
                        Якщо деякі поля <b>ламають шаблон або некоректно відображаються</b>, ви
                        можете тимчасово зняти їх з вибору. Для більш точного контролю завжди можна{' '}
                        <b>скопіювати потрібні дані</b> звідси та вставити безпосередньо в документ.
                    </div>
                </div>

                {/* Tabs if multiple users */}
                {usersConfig.length > 1 && (
                    <div className="flex border-b bg-gray-50">
                        {usersConfig.map((uc, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveTab(idx)}
                                className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                                    activeTab === idx
                                        ? 'bg-white border-b-2 border-indigo-500 text-indigo-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                {uc.user?.fullName || `Користувач ${idx + 1}`}
                            </button>
                        ))}
                    </div>
                )}

                {/* SEARCH & bulk actions */}
                <div className="p-4 border-b bg-gray-50 flex flex-col gap-3">
                    <input
                        type="text"
                        placeholder="🔍 Пошук поля або значення..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                    />

                    {includedFields && setIncludedFields && (
                        <div className="flex justify-between text-xs text-gray-600">
                            <button
                                onClick={() => handleToggleAll(true)}
                                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 transition"
                            >
                                ✅ Обрати всі
                            </button>
                            <button
                                onClick={() => handleToggleAll(false)}
                                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 transition"
                            >
                                ❌ Зняти всі
                            </button>
                        </div>
                    )}
                </div>

                {/* LIST */}
                <div className="p-4 flex-1 overflow-y-auto max-h-[55vh]">
                    {filteredFields.length === 0 ? (
                        <p className="text-center text-gray-400 text-sm">Немає даних</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredFields.map((field) => {
                                const label = getFieldLabel(field);
                                const value = String(user?.[field as keyof User] || '');

                                return (
                                    <div
                                        key={field}
                                        className="p-3 border rounded-lg bg-white hover:bg-indigo-50 hover:shadow-md transition relative"
                                    >
                                        <div className="flex items-start gap-2">
                                            {/* ✅ Checkbox for selecting fields */}
                                            {includedFields && setIncludedFields && (
                                                <input
                                                    type="checkbox"
                                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    checked={includedFields?.[field] || false}
                                                    onChange={() =>
                                                        setIncludedFields?.((prev) => ({
                                                            ...prev,
                                                            [field]: !prev[field],
                                                        }))
                                                    }
                                                />
                                            )}

                                            {/* ✅ Label + value (click to copy) */}
                                            <div
                                                onClick={() => handleCopy(value)}
                                                className="flex-1 cursor-pointer group"
                                                title="Натисніть, щоб скопіювати"
                                            >
                                                <span className="text-xs text-gray-500">
                                                    {label}
                                                </span>
                                                <span className="text-sm font-medium text-gray-800 mt-1 block break-words leading-snug">
                                                    {value}
                                                </span>
                                                <span className="text-[11px] text-gray-400 mt-1 block">
                                                    Натисніть, щоб скопіювати
                                                </span>

                                                {/* Copy icon on hover */}
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 text-indigo-500 text-xs">
                                                    <ClipboardCopy className="w-3.5 h-3.5" />
                                                    Скопіювати
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                        Активний користувач: <span className="font-medium">{userName}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium rounded-md bg-gray-200 hover:bg-gray-300 transition"
                    >
                        ✅ Готово
                    </button>
                </div>
            </div>
        </div>
    );
}
