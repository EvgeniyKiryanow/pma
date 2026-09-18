import { DatabaseBackup, FileUp } from 'lucide-react';
import { type DragEvent, useEffect, useState } from 'react';

import { reportError } from '../../../shared/api/errors';
import { downloadFile } from '../../../shared/lib/download';
import { pickFiles } from '../../../shared/lib/pickFiles';
import { Card, cn } from '../../../shared/ui';
import { confirmAction } from '../../../shared/ui/confirm';
import { toast } from '../../../shared/ui/toast';
import { useI18nStore } from '../../../stores/i18nStore';
import { useSearchJump } from '../../../stores/searchJumpStore';
import { usePermissions } from '../../../stores/sessionStore';
import { printDocx } from '../model/docxPrint';
import { type LibraryTemplate, useTemplateLibrary } from '../model/templateLibrary';
import DocxPreviewModal from './_components/DocxPreviewModal';
import TemplateGrid from './_components/TemplateGrid';

/**
 * Templates of reports: the ones shipped with the program and the unit's own .docx files.
 * Uploaded templates are stored in the data folder — backups and restores carry them.
 */
export default function UploadReportsTab() {
    const { t } = useI18nStore();
    const { can } = usePermissions();
    const canManage = can('reports.templates');
    const { templates, load, upload, remove, contentOf } = useTemplateLibrary();
    const [busy, setBusy] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [preview, setPreview] = useState<LibraryTemplate | null>(null);

    useEffect(() => {
        load().catch((err) => reportError(err, { context: 'templates.load' }));
    }, [load]);

    // The global search opens a template once the list is there.
    const reportsJump = useSearchJump((s) => s.jumps.reports);
    useEffect(() => {
        if (reportsJump?.view !== 'upload' || !reportsJump.templateId) return;
        const template = templates.find((item) => item.id === reportsJump.templateId);
        if (!template) return;
        setPreview(template);
        useSearchJump.getState().clear('reports');
    }, [reportsJump, templates]);

    const store = async (files: File[]) => {
        if (!files.length) return;
        setBusy(true);
        try {
            const added = await upload(files);
            if (added) toast.success(t('reports.templatesAdded', { count: added }));
            if (added < files.length) toast.warning(t('reports.onlyDocx'));
        } catch (err) {
            reportError(err, { context: 'templates.upload' });
        } finally {
            setBusy(false);
        }
    };

    const choose = async () => {
        try {
            await store(await pickFiles('docx', { multiple: true }));
        } catch (err) {
            reportError(err, { context: 'templates.pick' });
        }
    };

    const drop = (event: DragEvent<HTMLButtonElement>) => {
        event.preventDefault();
        setDragOver(false);
        void store(Array.from(event.dataTransfer.files));
    };

    const removeTemplate = async (template: LibraryTemplate) => {
        const confirmed = await confirmAction({
            title: t('reports.removeTemplate'),
            message: t('reports.removeTemplateConfirm', { name: template.name }),
            confirmLabel: t('common.delete'),
            tone: 'danger',
        });
        if (!confirmed) return;
        try {
            await remove(template);
        } catch (err) {
            reportError(err, { context: 'templates.remove' });
        }
    };

    const download = async (template: LibraryTemplate) =>
        downloadFile(await contentOf(template), `${template.name}.docx`);

    const savePdf = async (template: LibraryTemplate) => {
        try {
            await printDocx(await contentOf(template), template.name, 'pdf');
        } catch (err) {
            reportError(err, { context: 'templates.pdf' });
        }
    };

    return (
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="mx-auto max-w-6xl space-y-5">
                {canManage && (
                    <Card
                        title={t('reports.uploadTitle')}
                        description={t('reports.uploadDescription')}
                        icon={<FileUp />}
                    >
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void choose()}
                            onDrop={drop}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragOver(true);
                            }}
                            onDragLeave={() => setDragOver(false)}
                            className={cn(
                                'flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors disabled:cursor-wait disabled:opacity-60',
                                dragOver
                                    ? 'border-primary bg-primary-soft'
                                    : 'border-line-strong hover:border-primary hover:bg-primary-soft',
                            )}
                        >
                            <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary-ink">
                                <FileUp className="size-6" />
                            </span>
                            <span className="text-sm font-semibold text-ink">
                                {busy ? t('reports.uploading') : t('reports.uploadTemplates')}
                            </span>
                            <span className="text-xs text-ink-3">{t('reports.uploadHint')}</span>
                        </button>
                        <p className="mt-3 flex items-center gap-2 text-xs text-ink-3">
                            <DatabaseBackup className="size-4 shrink-0" />
                            {t('reports.inBackups')}
                        </p>
                    </Card>
                )}

                <Card title={t('reports.templatesTitle')}>
                    <TemplateGrid
                        templates={templates}
                        onPreview={setPreview}
                        onDownload={(tpl) => void download(tpl)}
                        onPdf={(tpl) => void savePdf(tpl)}
                        onRemove={canManage ? (tpl) => void removeTemplate(tpl) : undefined}
                    />
                </Card>
            </div>

            {preview && (
                <DocxPreviewModal
                    open
                    title={preview.name}
                    load={() => contentOf(preview)}
                    onClose={() => setPreview(null)}
                />
            )}
        </div>
    );
}
