import { useEffect, useState } from 'react';

import { useReportsStore } from '../../../report/model/reportsStore';

type Props = {
    open: boolean;
    onClose: () => void;
};

export default function AdditionalInfoModal({ open, onClose }: Props) {
    const additionalInfo = useReportsStore((s) => s.additionalInfo);
    const setAdditionalInfo = useReportsStore((s) => s.setAdditionalInfo);

    const [unitName, setUnitName] = useState('старший командир');
    const [commanderName, setCommanderName] = useState('Тополя Евгеній Миколаєвич');

    useEffect(() => {
        if (open && additionalInfo) {
            setUnitName(additionalInfo.unitName || '');
            setCommanderName(additionalInfo.commanderName || '');
        }
    }, [open, additionalInfo]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm transition-all">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-5">Уточнюючі дані</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Назва підрозділу
                        </label>
                        <input
                            type="text"
                            value={unitName}
                            onChange={(e) => setUnitName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ПІБ командира для якого клопотання
                        </label>
                        <input
                            type="text"
                            value={commanderName}
                            onChange={(e) => setCommanderName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition"
                        />
                    </div>
                    Військова частина номер? може ще якісь поля
                </div>

                <div className="mt-6 flex justify-between gap-4 items-center">
                    <button
                        onClick={() => {
                            setAdditionalInfo(null);
                            setUnitName('');
                            setCommanderName('');
                            onClose();
                        }}
                        className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition"
                    >
                        🗑 Видалити
                    </button>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition"
                        >
                            ✖️ Скасувати
                        </button>

                        <button
                            onClick={() => {
                                setAdditionalInfo({ unitName, commanderName });
                                onClose();
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition"
                        >
                            💾 Зберегти
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
