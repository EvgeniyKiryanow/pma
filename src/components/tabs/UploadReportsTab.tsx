import { useEffect, useRef, useState } from 'react';
import { useReportsStore } from '../../stores/reportsStore';
import { useI18nStore } from '../../stores/i18nStore';
import { renderAsync } from 'docx-preview';

export default function UploadReportsTab() {
    const { templates, addTemplate, addSavedTemplate } = useReportsStore();
    const { t } = useI18nStore();
    const [previewBuffer, setPreviewBuffer] = useState<ArrayBuffer | null>(null);
    const [uploadedTemplateName, setUploadedTemplateName] = useState<string>('');
    const previewRef = useRef<HTMLDivElement>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
            const result = reader.result;
            if (!result || typeof result === 'string') return;

            setPreviewBuffer(result);
            setUploadedTemplateName(file.name);
        };

        reader.readAsArrayBuffer(file);
    };

    useEffect(() => {
        if (previewBuffer) {
            const container = document.getElementById('docx-preview');
            if (container) {
                container.innerHTML = '';
                renderAsync(previewBuffer, container, undefined, {
                    debug: false,
                    experimental: false,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    ignoreFonts: false,
                    breakPages: true,
                    ignoreLastRenderedPageBreak: false,
                    renderHeaders: true,
                    renderFooters: true,
                    renderFootnotes: true,
                    renderEndnotes: true,
                }).catch((err) => {
                    console.error('Preview render failed:', err);
                    container.innerHTML = '<p style="color: red">Preview failed to load.</p>';
                });
            }
        }
    }, [previewBuffer]);

    const handleSaveTemplate = () => {
        if (!previewBuffer || !uploadedTemplateName) return;

        const saved = {
            id: `${Date.now()}`,
            name: `${uploadedTemplateName} - Copy`,
            content: previewBuffer,
            timestamp: Date.now(),
        };

        addSavedTemplate(saved);
        setShowSuccess(true);

        // Clear preview, buffer, and name
        setPreviewBuffer(null);
        setUploadedTemplateName('');
        const container = document.getElementById('docx-preview');
        if (container) container.innerHTML = '';

        setTimeout(() => setShowSuccess(false), 3000);
    };

    return (
        <div>
            {/* Upload Template */}
            <div className="mb-6 flex items-center justify-center pt-[15px]">
                <div className="mb-6">
                    <label
                        htmlFor="upload-template"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 cursor-pointer transition"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12"
                            />
                        </svg>
                        {t('reports.uploadTemplate')}
                    </label>

                    <input
                        id="upload-template"
                        type="file"
                        accept=".docx"
                        onChange={handleTemplateUpload}
                        className="hidden"
                    />
                </div>
                <div className="flex justify-end mb-6">
                    <button
                        onClick={handleSaveTemplate}
                        disabled={!previewBuffer}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 transition disabled:opacity-50"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7"
                            />
                        </svg>
                        {t('reports.saveTemplate')}
                    </button>
                </div>
            </div>
            {showSuccess && (
                <div className="mt-4 px-4 py-2 bg-green-100 text-green-700 border border-green-300 rounded text-sm shadow-sm">
                    ✅ {t('reports.savedSuccessfully')}
                </div>
            )}

            {/* DOCX Preview */}
            {previewBuffer && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2 text-gray-700">
                        {t('reports.previewTitle')}: {uploadedTemplateName}
                    </h3>
                    <div
                        id="docx-preview"
                        className="bg-white border rounded shadow overflow-auto max-h-[600px]"
                    />
                </div>
            )}
        </div>
    );
}
