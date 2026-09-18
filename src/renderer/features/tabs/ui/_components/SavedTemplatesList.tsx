import { CheckCircle2, Eye, FileText } from 'lucide-react';

import { cn } from '../../../../shared/ui';
import { useReportsStore } from '../../../report/model/reportsStore';

type Props = {
    templates: any[];
    selectedTemplateId: string | number;
    searchQuery: string;
    handlePreview: (tpl: any) => void;
};

export default function SavedTemplatesList({
    templates,
    selectedTemplateId,
    searchQuery,
    handlePreview,
}: Props) {
    const setSelectedTemplate = useReportsStore((s) => s.setSelectedTemplate);
    const filteredTemplates = templates.filter((tpl) =>
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    if (filteredTemplates.length === 0) {
        return <p className="text-sm text-ink-3">Немає шаблонів за цим запитом</p>;
    }

    return (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {filteredTemplates.map((tpl) => {
                const selected = selectedTemplateId === tpl.id;
                return (
                    <li
                        key={tpl.id || tpl.name}
                        className={cn(
                            'group relative flex flex-col rounded-xl border transition-all',
                            selected
                                ? 'border-primary bg-primary-soft shadow-card'
                                : 'border-line bg-surface hover:border-line-strong hover:shadow-card',
                        )}
                    >
                        <button
                            onClick={() => setSelectedTemplate(selected ? null : tpl.id)}
                            className="flex flex-1 items-start gap-3 p-3.5 text-left"
                        >
                            <span
                                className={cn(
                                    'grid size-10 shrink-0 place-items-center rounded-lg',
                                    selected
                                        ? 'bg-primary text-on-primary'
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
                                {tpl.timestamp && (
                                    <span className="mt-0.5 block text-[11px] text-ink-3">
                                        {new Date(tpl.timestamp).toLocaleDateString('uk-UA')}
                                    </span>
                                )}
                            </span>
                        </button>
                        <div className="flex border-t border-line/70">
                            <button
                                onClick={() => handlePreview(tpl)}
                                className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                            >
                                <Eye className="size-3.5" />
                                Переглянути
                            </button>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
