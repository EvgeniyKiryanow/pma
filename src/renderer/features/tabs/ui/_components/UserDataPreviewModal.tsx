import { ClipboardCopy } from 'lucide-react';
import { useState } from 'react';

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

    const allFields = Object.entries(user);

    const filteredFields = allFields
        .filter(([_, val]) => val !== null && val !== undefined && String(val).trim() !== '')
        .filter(([key, val]) => {
            const label = getFieldLabel(key).toLowerCase();
            const value = String(val).toLowerCase();
            const query = search.toLowerCase();
            return label.includes(query) || value.includes(query);
        });

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

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden text-sm">
                {/* HEADER */}
                <div className="px-5 py-3 border-b flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    <h2 className="text-lg font-semibold">📋 Деталі користувача</h2>
                    <button
                        onClick={onClose}
                        className="text-white text-xl hover:scale-110 transition"
                        title="Закрити"
                    >
                        ✕
                    </button>
                </div>

                {/* SEARCH BAR */}
                <div className="px-4 py-3 border-b bg-gray-50">
                    <input
                        type="text"
                        placeholder="🔍 Пошук поля або значення..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                    />
                </div>

                {/* DATA LIST */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto">
                    {filteredFields.length === 0 && (
                        <p className="col-span-2 text-center text-gray-400 text-sm">
                            ❌ Немає даних для відображення
                        </p>
                    )}

                    {filteredFields.map(([key, val]) => {
                        const label = getFieldLabel(key);
                        const value = String(val);

                        return (
                            <div
                                key={key}
                                onClick={() => handleCopy(value)}
                                className="p-3 border rounded-lg bg-white hover:bg-indigo-50 hover:shadow-md transition relative cursor-pointer group"
                                title="Натисніть, щоб скопіювати"
                            >
                                {/* Field label */}
                                <span className="text-xs text-gray-500">{label}</span>

                                {/* Field value */}
                                <span className="text-sm font-medium text-gray-800 mt-1 block break-words leading-snug">
                                    {value}
                                </span>

                                {/* Small hint under value */}
                                <span className="text-[11px] text-gray-400 mt-1 block">
                                    Натисніть, щоб скопіювати значення
                                </span>

                                {/* Copy icon on hover */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 text-indigo-500 text-xs">
                                    <ClipboardCopy className="w-3.5 h-3.5" />
                                    Скопіювати
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* FOOTER */}
                <div className="px-4 py-3 border-t flex justify-end bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-sm text-gray-700 font-medium bg-gray-200 hover:bg-gray-300 rounded-md transition"
                    >
                        Закрити
                    </button>
                </div>
            </div>
        </div>
    );
}
