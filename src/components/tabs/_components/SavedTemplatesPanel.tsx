import SavedTemplatesList from './SavedTemplatesList';
import { useI18nStore } from '../../../stores/i18nStore';
import { useReportsStore } from '../../../stores/reportsStore';
import { useState } from 'react';
import AdditionalInfoModal from './AdditionalInfoModal';
type Props = {
    savedTemplates: any[];
    selectedTemplateId: string | number;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    handlePreview: (tpl: any) => void;
    handleGenerate: () => void;
    handleDownload: () => void;
    showAdvanced: boolean;
    setShowAdvanced: (v: boolean) => void;
    previewBuffer: ArrayBuffer | null;
    selectedTemplate: any;
    selectedUser: any;
    selectedUser2: any;
};

export default function SavedTemplatesPanel({
    savedTemplates,
    selectedTemplateId,
    searchQuery,
    setSearchQuery,
    handlePreview,
    handleGenerate,
    handleDownload,
    showAdvanced,
    setShowAdvanced,
    previewBuffer,
    selectedTemplate,
    selectedUser,
    selectedUser2,
}: Props) {
    const { t } = useI18nStore();
    const [showDialog, setShowDialog] = useState(false);

    return (
        <main className="flex-1 p-6 overflow-y-auto bg-white">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">{t('reports.savedTemplates')}</h2>
            <AdditionalInfoModal open={showDialog} onClose={() => setShowDialog(false)} />
            <div className="mt-6 flex flex-wrap gap-3 pb-[15px] items-center">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    disabled={!selectedUser && !selectedUser2}
                    className={`px-4 py-2 rounded-md border font-medium text-sm transition 
                        ${
                            !selectedUser && !selectedUser2
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : 'text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                >
                    {showAdvanced ? '⬆️ Приховати поля' : '⚙️ Розширені налаштування'}
                </button>

                <button
                    onClick={() => setShowDialog(true)}
                    className="px-4 py-2 rounded-md border text-sm font-medium border-gray-300 hover:bg-gray-100 text-gray-700"
                >
                    ➕ Додати уточнюючі дані
                </button>

                <button
                    onClick={handleGenerate}
                    disabled={!selectedUser || !selectedTemplate}
                    className={`px-4 py-2 rounded-md text-white font-medium text-sm transition ${
                        !selectedUser || !selectedTemplate
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                >
                    {t('reports.generateFilledTemplate')}
                </button>

                <button
                    onClick={handleDownload}
                    disabled={!previewBuffer}
                    className={`px-4 py-2 rounded-md text-white font-medium text-sm transition ${
                        !previewBuffer
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                    }`}
                >
                    {t('reports.download')}
                </button>
            </div>

            <div className="mt-4 mb-2">
                <input
                    type="text"
                    placeholder={t('reports.searchTemplates') || 'Пошук шаблону...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {savedTemplates.length > 0 ? (
                <SavedTemplatesList
                    templates={savedTemplates}
                    selectedTemplateId={selectedTemplateId}
                    searchQuery={searchQuery}
                    handlePreview={handlePreview}
                />
            ) : (
                <p className="text-gray-500 text-sm">{t('reports.noSavedTemplates')}</p>
            )}
        </main>
    );
}
