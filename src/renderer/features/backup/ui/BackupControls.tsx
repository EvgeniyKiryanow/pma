import { useEffect, useState } from 'react';

import { useI18nStore } from '../../../../stores/i18nStore';

const INTERVAL_OPTIONS = [1, 3, 5, 7, 10, 30];

export default function BackupControls() {
    const [intervalDays, setIntervalDays] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedMessage, setLastSavedMessage] = useState('');
    const [autoBackupDir, setAutoBackupDir] = useState('');
    const { t } = useI18nStore();

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const current = await window.electronAPI.getBackupIntervalInDays();
                setIntervalDays(current || 1);

                const path = await window.electronAPI.getBackupPath();
                if (path) {
                    setAutoBackupDir(`${path}`);
                }
            } catch (err) {
                console.error('Failed to fetch backup interval or path:', err);
            }
        };

        fetchInitialData();
    }, []);

    const handleSaveInterval = async () => {
        setIsSaving(true);
        try {
            await window.electronAPI.setBackupIntervalInDays(intervalDays);
            const suffix = getDaySuffix(intervalDays);
            setLastSavedMessage(
                t('backupControls.saveSuccess', {
                    days: intervalDays,
                    suffix,
                }),
            );
        } catch {
            setLastSavedMessage(t('backupControls.saveFail'));
        } finally {
            setIsSaving(false);
            setTimeout(() => setLastSavedMessage(''), 3000);
        }
    };

    const getDaySuffix = (day: number): string => {
        // Only affects Ukrainian
        return t('backupControls.__lang') === 'ua' ? (day === 1 ? 'ь' : 'і') : 's';
    };

    return (
        <div className="max-w-lg mx-auto p-6 bg-white rounded shadow border space-y-6">
            <h2 className="text-lg font-semibold text-gray-800">{t('backupControls.title')}</h2>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('backupControls.frequency')}
                </label>
                <div className="flex items-center gap-2">
                    <select
                        value={intervalDays}
                        onChange={(e) => setIntervalDays(Number(e.target.value))}
                        className="px-3 py-1 border rounded"
                    >
                        {INTERVAL_OPTIONS.map((day) => {
                            const suffix = getDaySuffix(day);
                            return (
                                <option key={day} value={day}>
                                    {t('backupControls.everyXDays', { days: day, suffix })}
                                </option>
                            );
                        })}
                    </select>
                    <button
                        onClick={handleSaveInterval}
                        disabled={isSaving}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-60"
                    >
                        {isSaving ? t('backupControls.saving') : t('backupControls.save')}
                    </button>
                </div>
                {lastSavedMessage && (
                    <p className="mt-2 text-sm text-green-600">{lastSavedMessage}</p>
                )}
            </div>

            {autoBackupDir && (
                <div className="text-xs text-gray-500">
                    <span className="font-medium">{t('backupControls.location')}:</span>
                    <br />
                    <code className="break-all text-[10px]">{autoBackupDir}</code>
                </div>
            )}
        </div>
    );
}
