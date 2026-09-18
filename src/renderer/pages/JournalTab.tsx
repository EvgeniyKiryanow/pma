import { NotebookPen, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { JournalEntry } from '../../shared/types/journal';
import {
    groupJournal,
    journalCategories,
    journalCounts,
    type JournalFilters,
    type JournalView,
    useJournalStore,
} from '../features/journal/model/journalStore';
import JournalEntryEditor from '../features/journal/ui/JournalEntryEditor';
import JournalEntryRow from '../features/journal/ui/JournalEntryRow';
import { reportError } from '../shared/api/errors';
import { Button, cn, EmptyState, SearchInput, Tabs } from '../shared/ui';
import PageHeader from '../shared/ui/PageHeader';
import { useI18nStore } from '../stores/i18nStore';
import { useSearchJump } from '../stores/searchJumpStore';

const VIEWS: JournalView[] = ['active', 'today', 'week', 'overdue', 'pinned', 'done', 'all'];

/**
 * «Журнал»: the unit's notes and tasks — with dates, priorities, categories, people and
 * files. Grouped by what is due; ticked off when done.
 */
export default function JournalTab() {
    const { t } = useI18nStore();
    const entries = useJournalStore((s) => s.entries);
    const loaded = useJournalStore((s) => s.loaded);
    const [filters, setFilters] = useState<JournalFilters>({
        view: 'active',
        query: '',
        category: '',
    });
    // undefined: closed; null: a new entry.
    const [editing, setEditing] = useState<JournalEntry | null | undefined>(undefined);

    useEffect(() => {
        useJournalStore
            .getState()
            .load()
            .catch((err) => reportError(err, { context: 'journal.load' }));
    }, []);

    // The desktop and the search open an entry here.
    const journalJump = useSearchJump((s) => s.jumps.journal);
    useEffect(() => {
        if (journalJump === undefined || !loaded) return;
        useSearchJump.getState().clear('journal');
        if (journalJump === 'new') setEditing(null);
        else setEditing(entries.find((e) => e.uuid === journalJump) ?? undefined);
    }, [journalJump, loaded, entries]);

    const groups = useMemo(() => groupJournal(entries, filters), [entries, filters]);
    const counts = useMemo(() => journalCounts(entries), [entries]);
    const categories = useMemo(() => journalCategories(entries), [entries]);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <PageHeader
                title={t('journal.title')}
                description={t('journal.description')}
                icon={<NotebookPen />}
                actions={
                    <Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>
                        {t('journal.add')}
                    </Button>
                }
            />
            <div className="@container min-h-0 flex-1 overflow-auto p-5">
                <div className="mx-auto max-w-5xl space-y-4">
                    <div className="card space-y-3 p-4">
                        <Tabs
                            variant="pills"
                            value={filters.view}
                            onChange={(view) => setFilters((f) => ({ ...f, view }))}
                            items={VIEWS.map((view) => ({
                                value: view,
                                label: t(`journal.views.${view}`),
                                count: counts[view],
                            }))}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            <SearchInput
                                className="min-w-60 flex-1"
                                value={filters.query}
                                onChange={(query) => setFilters((f) => ({ ...f, query }))}
                                placeholder={t('journal.search')}
                            />
                            {categories.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {['', ...categories].map((category) => (
                                        <button
                                            key={category || 'all'}
                                            type="button"
                                            onClick={() => setFilters((f) => ({ ...f, category }))}
                                            className={cn(
                                                'rounded-full border px-3 py-1 text-xs font-medium',
                                                filters.category === category
                                                    ? 'border-primary bg-primary-soft text-primary-ink'
                                                    : 'border-line text-ink-3 hover:text-ink',
                                            )}
                                        >
                                            {category || t('journal.allCategories')}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {groups.length === 0 ? (
                        <div className="card">
                            <EmptyState
                                icon={<NotebookPen />}
                                title={entries.length ? t('journal.nothing') : t('journal.empty')}
                                description={t('journal.emptyHint')}
                                action={
                                    <Button
                                        icon={<Plus className="size-4" />}
                                        onClick={() => setEditing(null)}
                                    >
                                        {t('journal.add')}
                                    </Button>
                                }
                            />
                        </div>
                    ) : (
                        groups.map((group) => (
                            <section key={group.bucket} className="space-y-2">
                                <h3
                                    className={cn(
                                        'eyebrow flex items-center gap-2',
                                        group.bucket === 'overdue' && 'text-danger-ink',
                                    )}
                                >
                                    {t(`journal.buckets.${group.bucket}`)}
                                    <span className="font-mono">{group.entries.length}</span>
                                </h3>
                                <ul className="space-y-2">
                                    {group.entries.map((entry) => (
                                        <JournalEntryRow
                                            key={entry.uuid}
                                            entry={entry}
                                            onOpen={setEditing}
                                        />
                                    ))}
                                </ul>
                            </section>
                        ))
                    )}
                </div>
            </div>
            {editing !== undefined && (
                <JournalEntryEditor entry={editing} onClose={() => setEditing(undefined)} />
            )}
        </div>
    );
}
