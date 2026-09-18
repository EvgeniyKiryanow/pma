import { ListTree, Trash2 } from 'lucide-react';

import { Button, SearchInput } from '../../../shared/ui';
import PageHeader from '../../../shared/ui/PageHeader';

type Props = {
    total: number;
    assigned: number;
    query: string;
    onQueryChange: (value: string) => void;
    onDeleteAll?: () => void;
};

/** Staffing table header: counters, search and the bulk delete. */
export default function ShtatniPosadyHeader({
    total,
    assigned,
    query,
    onQueryChange,
    onDeleteAll,
}: Props) {
    const vacant = total - assigned;
    return (
        <PageHeader
            title="БЧС — штатні посади"
            description={
                <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Усього: {total}</span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-success" />
                        Призначено: {assigned}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-warning" />
                        Вакантно: {vacant}
                    </span>
                </span>
            }
            icon={<ListTree />}
            actions={
                <>
                    <SearchInput
                        value={query}
                        onChange={onQueryChange}
                        placeholder="Пошук: номер, посада, людина…"
                        size="sm"
                        className="w-64"
                    />
                    {total > 0 && onDeleteAll && (
                        <Button
                            variant="danger-soft"
                            size="sm"
                            icon={<Trash2 className="size-3.5" />}
                            onClick={onDeleteAll}
                        >
                            Видалити всі
                        </Button>
                    )}
                </>
            }
        />
    );
}
