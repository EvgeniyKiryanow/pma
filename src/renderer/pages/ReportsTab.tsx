import { FileText, Users } from 'lucide-react';
import { useState } from 'react';

import SavedReportsTab from '../features/tabs/ui/SavedReportsTab';
import UploadReportsTab from '../features/tabs/ui/UploadReportsTab';
import YourSavedReportsTab from '../features/tabs/ui/YourSavedReportsTab';
import { useI18nStore } from '../../stores/i18nStore';

export default function ReportsTab() {
    const { t } = useI18nStore();
    const [tab, setTab] = useState<'upload' | 'saved' | 'yourSaved'>('saved');

    return (
        <div className="h-full w-full flex flex-col">
            {/* Tabs Header */}
            <div className="flex gap-4 border-b bg-white px-6 py-3 text-sm font-medium">
                {/* <button
                    onClick={() => setTab('upload')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded ${
                        tab === 'upload'
                            ? 'bg-blue-100 text-blue-800'
                            : 'text-gray-500 hover:bg-gray-100'
                    }`}
                >
                    <FilePlus className="w-4 h-4" />
                    {t('reports.uploadTab')}
                </button> */}

                <button
                    onClick={() => setTab('saved')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded ${
                        tab === 'saved'
                            ? 'bg-blue-100 text-blue-800'
                            : 'text-gray-500 hover:bg-gray-100'
                    }`}
                >
                    <FileText className="w-4 h-4" />
                    {t('reports.savedTemplates')}
                </button>

                <button
                    onClick={() => setTab('yourSaved')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded ${
                        tab === 'yourSaved'
                            ? 'bg-blue-100 text-blue-800'
                            : 'text-gray-500 hover:bg-gray-100'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    {t('reports.savedTab')}
                </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
                {tab === 'upload' && <UploadReportsTab />}
                {tab === 'saved' && <SavedReportsTab />}
                {tab === 'yourSaved' && <YourSavedReportsTab />}
            </div>
        </div>
    );
}
