import { CheckCircle2, Download, Eye, FileDown, FileText, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn, SearchInput } from '../../../../shared/ui';
import { useI18nStore } from '../../../../stores/i18nStore';
import type { LibraryTemplate, TemplateSource } from '../../model/templateLibrary';

type Filter = 'all' | TemplateSource;

/** Templates with a search and a «мої / вбудовані» filter; picking, preview, download, delete. */
export default function TemplateGrid({
    templates,
    selectedId,
    onSelect,
    onPreview,
    onDownload,
    onPdf,
    onRemove,
}: {
    templates: LibraryTemplate[];
    selectedId?: string | null;
    onSelect?: (template: LibraryTemplate | null) => void;
    onPreview: (template: LibraryTemplate) => void;
    onDownload?: (template: LibraryTemplate) => void;
    /** The template as a PDF (drawn by the program, no Word needed). */
    onPdf?: (template: LibraryTemplate) => void;
    /** Only uploaded templates can be removed; absent when the user may not manage them. */
    onRemove?: (template: LibraryTemplate) => void;
}) {
    const { t } = useI18nStore();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<Filter>('all');

    const counts = useMemo(
        () => ({
            all: templates.length,
            uploaded: templates.filter((tpl) => tpl.source === 'uploaded').length,
            bundled: templates.filter((tpl) => tpl.source === 'bundled').length,
        }),
        [templates],
    );
    const shown = useMemo(() => {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        return templates.filter(
            (tpl) =>
                (filter === 'all' || tpl.source === filter) &&
                words.every((word) => tpl.name.toLowerCase().includes(word)),
        );
    }, [templates, query, filter]);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                {(['all', 'uploaded', 'bundled'] as const).map((id) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setFilter(id)}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                            filter === id
                                ? 'border-primary bg-primary-soft text-primary-ink'
                                : 'border-line text-ink-3 hover:border-line-strong hover:text-ink',
                        )}
                    >
                        {t(`reports.templateFilter.${id}`)}
                        <span className="tabular-nums opacity-70">{counts[id]}</span>
                    </button>
                ))}
                <SearchInput
                    value={query}
                    onChange={setQuery}
                    placeholder={t('reports.searchTemplates')}
                    size="sm"
                    className="ml-auto w-full max-w-xs"
                />
            </div>

            {shown.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-3">
                    {templates.length
                        ? t('reports.noTemplatesFound')
                        : t('reports.noSavedTemplates')}
                </p>
            ) : (
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
                    {shown.map((tpl) => {
                        const selected = selectedId === tpl.id;
                        return (
                            <li
                                key={tpl.id}
                                className={cn(
                                    'group flex flex-col rounded-xl border transition-all',
                                    selected
                                        ? 'border-primary bg-primary-soft shadow-card'
                                        : 'border-line bg-surface hover:border-line-strong hover:shadow-card',
                                )}
                            >
                                <button
                                    type="button"
                                    disabled={!onSelect}
                                    onClick={() => onSelect?.(selected ? null : tpl)}
                                    className="flex flex-1 items-start gap-3 p-3.5 text-left disabled:cursor-default"
                                >
                                    <span
                                        className={cn(
                                            'grid size-10 shrink-0 place-items-center rounded-lg',
                                            selected
                                                ? 'bg-primary text-on-primary'
                                                : tpl.source === 'uploaded'
                                                  ? 'bg-info-soft text-info-ink'
                                                  : 'bg-surface-2 text-ink-3',
                                        )}
                                    >
                                        {selected ? (
                                            <CheckCircle2 className="size-5" />
                                        ) : (
                                            <FileText className="size-5" />
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span
                                            className={cn(
                                                'line-clamp-2 text-[13px] font-semibold leading-snug',
                                                selected ? 'text-primary-ink' : 'text-ink',
                                            )}
                                        >
                                            {tpl.name}
                                        </span>
                                        <span className="mt-0.5 block text-[11px] text-ink-3">
                                            {t(`reports.templateSource.${tpl.source}`)}
                                            {tpl.timestamp
                                                ? ` · ${new Date(tpl.timestamp).toLocaleDateString('uk-UA')}`
                                                : ''}
                                        </span>
                                    </span>
                                </button>
                                <div className="flex border-t border-line/70 text-xs font-medium text-ink-2">
                                    <button
                                        type="button"
                                        onClick={() => onPreview(tpl)}
                                        className="flex flex-1 items-center justify-center gap-1.5 py-2 transition-colors hover:bg-surface-2 hover:text-ink"
                                    >
                                        <Eye className="size-3.5" />
                                        {t('reports.preview')}
                                    </button>
                                    {onDownload && (
                                        <button
                                            type="button"
                                            onClick={() => onDownload(tpl)}
                                            title={t('reports.downloadTemplate')}
                                            aria-label={t('reports.downloadTemplate')}
                                            className="grid w-10 place-items-center border-l border-line/70 transition-colors hover:bg-surface-2 hover:text-ink"
                                        >
                                            <Download className="size-3.5" />
                                        </button>
                                    )}
                                    {onPdf && (
                                        <button
                                            type="button"
                                            onClick={() => onPdf(tpl)}
                                            title={t('reports.savePdf')}
                                            aria-label={t('reports.savePdf')}
                                            className="flex items-center gap-1 border-l border-line/70 px-2.5 transition-colors hover:bg-surface-2 hover:text-ink"
                                        >
                                            <FileDown className="size-3.5" />
                                            PDF
                                        </button>
                                    )}
                                    {onRemove && tpl.source === 'uploaded' && (
                                        <button
                                            type="button"
                                            onClick={() => onRemove(tpl)}
                                            title={t('reports.removeTemplate')}
                                            aria-label={t('reports.removeTemplate')}
                                            className="grid w-10 place-items-center border-l border-line/70 transition-colors hover:bg-danger-soft hover:text-danger-ink"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
