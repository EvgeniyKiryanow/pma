import { FileUp, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { reportError } from '../../../shared/api/errors';
import { reportTemplatesApi } from '../../../shared/api/reports';
import { pickFile } from '../../../shared/lib/pickFiles';
import { Alert, Button, Card } from '../../../shared/ui';
import { toast } from '../../../shared/ui/toast';
import { useI18nStore } from '../../../stores/i18nStore';
import { useReportsStore } from '../../report/model/reportsStore';

export default function UploadReportsTab() {
    const { addSavedTemplate } = useReportsStore();
    const { t } = useI18nStore();
    const [previewBuffer, setPreviewBuffer] = useState<ArrayBuffer | null>(null);
    const [uploadedTemplateName, setUploadedTemplateName] = useState<string>('');
    // The PDF is kept in memory only (a blob URL), nothing is written to disk for the preview.
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const chooseTemplate = async () => {
        try {
            const file = await pickFile('docx');
            if (!file) return;
            setPreviewBuffer(await file.arrayBuffer());
            setUploadedTemplateName(file.name);
        } catch (err) {
            reportError(err, { context: 'template-upload' });
        }
    };

    useEffect(() => {
        if (!previewBuffer || !uploadedTemplateName) return;
        let url: string | null = null;
        const convertToPdf = async () => {
            try {
                const pdf = await reportTemplatesApi.convertToPdf(
                    previewBuffer,
                    uploadedTemplateName,
                );
                url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
                setPdfUrl(url);
            } catch (err) {
                console.error('PDF conversion failed:', err);
            }
        };
        void convertToPdf();
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [previewBuffer, uploadedTemplateName]);

    const handleSaveTemplate = () => {
        if (!previewBuffer || !uploadedTemplateName) return;

        const saved = {
            id: `${Date.now()}`,
            name: `${uploadedTemplateName} - Copy`,
            content: previewBuffer,
            timestamp: Date.now(),
        };

        addSavedTemplate(saved);
        toast.success(t('reports.savedSuccessfully'));

        setPreviewBuffer(null);
        setUploadedTemplateName('');
        setPdfUrl(null);
    };

    return (
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="mx-auto max-w-4xl space-y-5">
                <Card
                    title={t('reports.uploadTitle')}
                    description="Шаблон — це документ Word (.docx) з полями для автоматичного заповнення даними військовослужбовця."
                    icon={<FileUp />}
                >
                    <button
                        type="button"
                        onClick={() => void chooseTemplate()}
                        className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong px-6 py-10 text-center transition-colors hover:border-primary hover:bg-primary-soft"
                    >
                        <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary-ink">
                            <FileUp className="size-6" />
                        </span>
                        <span className="text-sm font-semibold text-ink">
                            {uploadedTemplateName || t('reports.uploadTemplate')}
                        </span>
                        <span className="text-xs text-ink-3">
                            {uploadedTemplateName
                                ? 'Натисніть, щоб обрати інший файл'
                                : 'Лише файли .docx'}
                        </span>
                    </button>

                    <div className="mt-4 flex justify-end">
                        <Button
                            onClick={handleSaveTemplate}
                            disabled={!previewBuffer}
                            icon={<Save className="size-4" />}
                        >
                            {t('reports.saveTemplate')}
                        </Button>
                    </div>
                </Card>

                {uploadedTemplateName && !pdfUrl && (
                    <Alert tone="info">Готуємо попередній перегляд…</Alert>
                )}

                {pdfUrl && (
                    <Card title={`${t('reports.previewTitle')}: ${uploadedTemplateName}`}>
                        <iframe
                            src={pdfUrl}
                            className="h-[640px] w-full rounded-lg border border-line bg-surface-2"
                            title="PDF Preview"
                        />
                    </Card>
                )}
            </div>
        </div>
    );
}
