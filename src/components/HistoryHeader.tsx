import { ClipboardList, Plus, ShieldCheck } from 'lucide-react';
import { StatusExcel } from '../types/excelUserStatuses';
import { useI18nStore } from '../stores/i18nStore';

type HistoryHeaderProps = {
    currentStatus?: string;
    onAddHistory: () => void;
    onStatusChange: (status: StatusExcel) => void;
};

export function HistoryHeader({ currentStatus, onAddHistory, onStatusChange }: HistoryHeaderProps) {
    const { t } = useI18nStore();

    return (
        <div className="mb-6">
            {/* Modern header container */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-blue-50 to-white border border-gray-200 rounded-xl shadow-sm p-4">
                {/* Left: Title */}
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 text-blue-600 p-2 rounded-lg shadow-sm">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">
                            {t('history.title')}
                        </h2>
                        <p className="text-xs text-gray-500">{t('history.searchPlaceholder')}</p>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Soldier status dropdown */}
                    <div className="relative">
                        <ShieldCheck className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                        <select
                            className="pl-9 pr-4 py-2 rounded-full border border-gray-300 bg-white text-sm shadow hover:border-blue-400 focus:border-blue-500 focus:ring focus:ring-blue-200 transition"
                            value={currentStatus || ''}
                            onChange={(e) => onStatusChange(e.target.value as StatusExcel)}
                        >
                            <option value="">{t('historyItem.changeStatus')}</option>
                            {Object.values(StatusExcel).map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Add History button */}
                    <button
                        onClick={onAddHistory}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-md transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        {t('history.add')}
                    </button>
                </div>
            </div>
        </div>
    );
}
