import { Download, FileCheck2, FileText, Sparkles } from 'lucide-react';
import type { RefObject } from 'react';

import { Button, cn, SearchInput } from '../../../../shared/ui';
import { useI18nStore } from '../../../../stores/i18nStore';
import SavedTemplatesList from './SavedTemplatesList';
import { StepTitle } from './UserList';

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
    previewRef: RefObject<HTMLDivElement>;
    generating?: boolean;
    selectedTemplate: any;
    selectedUser: any;
    selectedUser2: any;
};

/** Steps 2 and 3 of report generation: choose a template, generate and download. */
export default function SavedTemplatesPanel({
    savedTemplates,
    selectedTemplateId,
    searchQuery,
    setSearchQuery,
    handlePreview,
    handleGenerate,
    handleDownload,
    previewBuffer,
    previewRef,
    generating = false,
    selectedTemplate,
    selectedUser,
}: Props) {
    const { t } = useI18nStore();
    const ready = Boolean(selectedUser && selectedTemplate);

    return (
        <main className="min-w-0 flex-1 space-y-5 overflow-y-auto p-5">
            <section className="card p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <StepTitle
                        step={2}
                        title="Шаблон документа"
                        hint={
                            selectedTemplate ? `Обрано: ${selectedTemplate.name}` : 'Оберіть шаблон'
                        }
                    />
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder={t('reports.searchTemplates') || 'Пошук шаблону…'}
                        size="sm"
                        className="w-full max-w-xs"
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
                    <p className="text-sm text-ink-3">{t('reports.noSavedTemplates')}</p>
                )}
            </section>

            <section className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <StepTitle
                        step={3}
                        title="Готовий рапорт"
                        hint={
                            ready
                                ? `${selectedUser.fullName} · ${selectedTemplate.name}`
                                : 'Оберіть військовослужбовця та шаблон'
                        }
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button
                            onClick={handleGenerate}
                            disabled={!ready}
                            loading={generating}
                            icon={<Sparkles className="size-4" />}
                        >
                            {t('reports.generateFilledTemplate')}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleDownload}
                            disabled={!previewBuffer}
                            icon={<Download className="size-4" />}
                        >
                            {t('reports.download')}
                        </Button>
                    </div>
                </div>

                <div
                    className={cn(
                        'border-t border-line bg-surface-2',
                        previewBuffer ? 'p-4' : 'hidden',
                    )}
                >
                    <p className="mb-3 flex items-center gap-2 text-xs text-ink-3">
                        <FileCheck2 className="size-4 text-success" />
                        Попередній перегляд (оформлення може трохи відрізнятися від Word)
                    </p>
                    <div ref={previewRef} className="max-h-[70vh] overflow-auto rounded-lg" />
                </div>

                {!previewBuffer && (
                    <div className="flex items-center gap-3 border-t border-dashed border-line px-5 py-6 text-sm text-ink-3">
                        <FileText className="size-5 shrink-0" />
                        Після формування тут зʼявиться попередній перегляд документа.
                    </div>
                )}
            </section>
        </main>
    );
}
