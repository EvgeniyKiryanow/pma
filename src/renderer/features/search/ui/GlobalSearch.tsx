import {
    ArrowDownUp,
    Clock,
    CornerDownLeft,
    FileText,
    FolderOpen,
    LayoutGrid,
    ListTree,
    Medal,
    NotebookPen,
    Paperclip,
    ScrollText,
    Search,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { allAwards, awardTitle } from '../../../../shared/awards/catalog';
import { DIRECTIVE_TYPES, type DirectiveRecord } from '../../../../shared/types/directive';
import type { RecentFile } from '../../../../shared/types/documents';
import { visibleTabs } from '../../../app/navigation';
import { useAwardTypesStore } from '../../../entities/award/model/awardTypesStore';
import { useShtatniStore } from '../../../entities/shtatna-posada/model/useShtatniStore';
import AwardIcon from '../../../entities/user/ui/card/AwardIcon';
import { directivesApi } from '../../../shared/api/directives';
import { documentsApi } from '../../../shared/api/documents';
import { Avatar, cn } from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';
import { usePermissions } from '../../../stores/sessionStore';
import { useUserStore } from '../../../stores/userStore';
import { countAwards } from '../../awards/model/registry';
import { useJournalStore } from '../../journal/model/journalStore';
import { useReportFilesStore } from '../../report/model/reportFilesStore';
import { useTemplateLibrary } from '../../tabs/model/templateLibrary';
import {
    globalSearch,
    highlightRanges,
    SEARCH_CATEGORIES,
    type SearchCategory,
    type SearchHit,
    type SearchSection,
} from '../model/globalSearch';
import { runSearchAction } from '../model/runSearchAction';
import { useGlobalSearch } from '../model/searchStore';

const CATEGORY_ICONS: Record<SearchCategory, ReactNode> = {
    people: <Users />,
    positions: <ListTree />,
    awards: <Medal />,
    orders: <ScrollText />,
    journal: <NotebookPen />,
    files: <Paperclip />,
    reports: <FolderOpen />,
    templates: <FileText />,
    sections: <LayoutGrid />,
};

/** Results per category when everything is shown; a category on its own shows up to 50. */
const PER_GROUP = 5;

function Highlight({ text, query }: { text: string; query: string }) {
    const ranges = highlightRanges(text, query);
    if (!ranges.length) return <>{text}</>;
    const parts: ReactNode[] = [];
    let from = 0;
    ranges.forEach(([start, end], i) => {
        if (start > from) parts.push(text.slice(from, start));
        parts.push(
            <mark key={i} className="rounded-sm bg-brass-soft px-px text-inherit">
                {text.slice(start, end)}
            </mark>,
        );
        from = end;
    });
    if (from < text.length) parts.push(text.slice(from));
    return <>{parts}</>;
}

/** Opens the search from anywhere: Ctrl+K, Ctrl+Shift+F or «/» outside a text field. */
export function useGlobalSearchHotkeys(enabled: boolean): void {
    useEffect(() => {
        if (!enabled) return;
        const onKey = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            const typing =
                event.target instanceof HTMLElement &&
                (event.target.isContentEditable ||
                    ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName));
            const ctrlK =
                (event.ctrlKey || event.metaKey) && (key === 'k' || event.code === 'KeyK');
            const ctrlShiftF =
                (event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyF';
            const slash = key === '/' && !typing && !event.ctrlKey && !event.altKey;
            if (ctrlK || ctrlShiftF || slash) {
                event.preventDefault();
                useGlobalSearch.getState().show();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [enabled]);
}

/** The global search window: people, positions, awards, orders, reports, templates, sections. */
export default function GlobalSearch() {
    const open = useGlobalSearch((s) => s.open);
    useGlobalSearchHotkeys(true);
    if (!open) return null;
    return <SearchWindow />;
}

function SearchWindow() {
    const { t } = useI18nStore();
    const { can, canAny, session } = usePermissions();
    const permissionsKey = (session?.permissions ?? []).join(',');
    const { query, category, recent, hide, setQuery, setCategory, remember } = useGlobalSearch();

    const users = useUserStore((s) => s.users);
    const positions = useShtatniStore((s) => s.shtatniPosady);
    const reports = useReportFilesStore((s) => s.files);
    const journal = useJournalStore((s) => s.entries);
    const templates = useTemplateLibrary((s) => s.templates);
    const awardsVersion = useAwardTypesStore((s) => s.version);
    const [orders, setOrders] = useState<DirectiveRecord[]>([]);
    const [files, setFiles] = useState<RecentFile[]>([]);

    const canPeople = can('personnel.view');
    const canStaffing = can('staffing.view');
    const canReports = can('reports.view');
    const canOrders = can('directives.view');

    // What the other sections load lazily is loaded here, once per opening.
    useEffect(() => {
        if (canReports) {
            void useReportFilesStore
                .getState()
                .loadFromDb()
                .catch(() => undefined);
            if (!useTemplateLibrary.getState().loaded) {
                void useTemplateLibrary
                    .getState()
                    .load()
                    .catch(() => undefined);
            }
        }
        if (!useJournalStore.getState().loaded) {
            void useJournalStore
                .getState()
                .load()
                .catch(() => undefined);
        }
        if (canPeople) {
            documentsApi
                .recent(500)
                .then(setFiles)
                .catch(() => undefined);
        }
        if (canOrders) {
            Promise.all(DIRECTIVE_TYPES.map((type) => directivesApi.list(type)))
                .then((lists) => setOrders(lists.flat()))
                .catch(() => undefined);
        }
    }, [canReports, canOrders, canPeople]);

    const sections = useMemo((): SearchSection[] => {
        const tabs = visibleTabs({ canAny, hasStaffingTable: positions.length > 0 });
        const list: SearchSection[] = tabs.map((tab) => ({
            key: tab.key,
            label: tab.label(t),
            keywords: t(`search.keywords.${tab.key}`),
            action: { type: 'tab', tab: tab.key },
        }));
        if (can('personnel.create')) {
            list.unshift({
                key: 'add-person',
                label: t('search.commands.addPerson'),
                keywords: t('search.keywords.addPerson'),
                action: { type: 'command', command: 'add-person' },
            });
        }
        return list;
        // The permissions as text: `can`/`canAny` are new functions on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [t, permissionsKey, positions.length]);

    const awards = useMemo(() => {
        if (!canPeople) return [];
        const counts = countAwards(users);
        return allAwards()
            .filter((award) => award.id !== 'other')
            .map((award) => ({ award, holders: counts.get(award.id)?.people ?? 0 }));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `awardsVersion`: own awards
    }, [canPeople, users, awardsVersion]);

    const hits = useMemo(() => {
        const fieldLabel = (field: string) => {
            for (const key of [`search.fields.${field}`, `card.fields.${field}`]) {
                const label = t(key);
                if (label !== key) return label;
            }
            return field;
        };
        return globalSearch(
            query,
            {
                users: canPeople ? users : [],
                positions: canStaffing ? positions : [],
                awards,
                orders: canOrders ? orders : [],
                journal,
                files: canPeople ? files : [],
                reports: canReports ? reports : [],
                templates: canReports ? templates : [],
                sections,
            },
            {
                fieldLabel,
                awardTitles: (user) => (user.awardRecords ?? []).map(awardTitle),
                orderTypeLabel: (type) => t(`search.orderTypes.${type}`),
                fileSourceLabel: (source) => t(`dashboard.files.sources.${source}`),
            },
        );
    }, [
        query,
        users,
        positions,
        awards,
        orders,
        journal,
        files,
        reports,
        templates,
        sections,
        t,
        canPeople,
        canStaffing,
        canOrders,
        canReports,
    ]);

    const counts = useMemo(() => {
        const result = new Map<SearchCategory, number>();
        for (const hit of hits) result.set(hit.category, (result.get(hit.category) ?? 0) + 1);
        return result;
    }, [hits]);

    // What is on the screen, in order: the list the arrows move through.
    const shown = useMemo(() => {
        if (category !== 'all') return hits.filter((hit) => hit.category === category);
        return SEARCH_CATEGORIES.flatMap((c) =>
            hits.filter((hit) => hit.category === c).slice(0, PER_GROUP),
        );
    }, [hits, category]);

    const [active, setActive] = useState(0);
    useEffect(() => setActive(0), [query, category]);
    const listRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        listRef.current
            ?.querySelector(`[data-index="${active}"]`)
            ?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    const choose = (hit: SearchHit, edit = false) => {
        remember(query);
        hide();
        runSearchAction(hit.action, { edit });
    };

    const categories = (['all', ...SEARCH_CATEGORIES] as const).filter(
        (c) => c === 'all' || counts.get(c),
    );

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((i) => Math.min(i + 1, shown.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
        } else if (event.key === 'Enter' && shown[active]) {
            event.preventDefault();
            choose(shown[active], event.ctrlKey || event.metaKey);
        } else if (event.key === 'Tab' && query) {
            event.preventDefault();
            const index = categories.indexOf(category as (typeof categories)[number]);
            const step = event.shiftKey ? -1 : 1;
            setCategory(categories[(index + step + categories.length) % categories.length]);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            hide();
        }
    };

    let lastCategory: SearchCategory | null = null;

    return createPortal(
        <div className="fixed inset-x-0 bottom-0 top-10 z-[70] flex items-start justify-center p-3 pt-[8vh]">
            <div
                className="absolute inset-0 animate-fade-in bg-scrim backdrop-blur-[2px]"
                onMouseDown={hide}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t('search.title')}
                className="relative flex max-h-[78vh] w-full max-w-3xl animate-pop-in flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
                onKeyDown={onKeyDown}
            >
                <div className="flex items-center gap-3 border-b border-line px-4">
                    <Search className="size-5 shrink-0 text-ink-3" />
                    <input
                        autoFocus
                        // The last query stays, selected: typing replaces it, arrows keep it.
                        onFocus={(e) => e.currentTarget.select()}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('search.placeholder')}
                        aria-label={t('search.title')}
                        className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            aria-label={t('search.clear')}
                            className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                    <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
                        Esc
                    </kbd>
                </div>

                {query.trim() && (
                    <div className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2">
                        {categories.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setCategory(c)}
                                className={cn(
                                    'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors [&_svg]:size-3.5',
                                    category === c
                                        ? 'border-primary bg-primary-soft text-primary-ink'
                                        : 'border-line text-ink-3 hover:border-line-strong hover:text-ink',
                                )}
                            >
                                {c !== 'all' && CATEGORY_ICONS[c]}
                                {t(`search.categories.${c}`)}
                                <span className="font-mono text-[11px] opacity-70">
                                    {c === 'all' ? hits.length : counts.get(c)}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto py-1">
                    {!query.trim() ? (
                        <EmptyQuery
                            recent={recent}
                            sections={sections}
                            onRecent={setQuery}
                            onSection={(section) => {
                                hide();
                                runSearchAction(section.action);
                            }}
                        />
                    ) : shown.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <p className="text-sm font-semibold text-ink">{t('search.nothing')}</p>
                            <p className="mt-1 text-[13px] text-ink-3">{t('search.nothingHint')}</p>
                        </div>
                    ) : (
                        shown.map((hit, index) => {
                            const header =
                                category === 'all' && hit.category !== lastCategory ? (
                                    <div className="flex items-center justify-between px-4 pb-1 pt-3">
                                        <span className="eyebrow">
                                            {t(`search.categories.${hit.category}`)}
                                        </span>
                                        {(counts.get(hit.category) ?? 0) > PER_GROUP && (
                                            <button
                                                type="button"
                                                onClick={() => setCategory(hit.category)}
                                                className="text-xs font-medium text-primary-ink hover:underline"
                                            >
                                                {t('search.showAll', {
                                                    count: counts.get(hit.category),
                                                })}
                                            </button>
                                        )}
                                    </div>
                                ) : null;
                            lastCategory = hit.category;
                            return (
                                <div key={hit.key}>
                                    {header}
                                    <HitRow
                                        hit={hit}
                                        index={index}
                                        active={index === active}
                                        query={query}
                                        onHover={() => setActive(index)}
                                        onChoose={(edit) => choose(hit, edit)}
                                    />
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-surface-2 px-4 py-2 text-[11px] text-ink-3">
                    <span className="flex items-center gap-1">
                        <ArrowDownUp className="size-3" /> {t('search.keys.move')}
                    </span>
                    <span className="flex items-center gap-1">
                        <CornerDownLeft className="size-3" /> {t('search.keys.open')}
                    </span>
                    <span>
                        <kbd className="font-mono">Ctrl+Enter</kbd> {t('search.keys.edit')}
                    </span>
                    <span>
                        <kbd className="font-mono">Tab</kbd> {t('search.keys.category')}
                    </span>
                    <span className="ml-auto">{t('search.keys.layout')}</span>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function HitRow({
    hit,
    index,
    active,
    query,
    onHover,
    onChoose,
}: {
    hit: SearchHit;
    index: number;
    active: boolean;
    query: string;
    onHover: () => void;
    onChoose: (edit: boolean) => void;
}) {
    const { t } = useI18nStore();
    const user = useUserStore((s) =>
        hit.category === 'people' && hit.userId ? s.users.find((u) => u.id === hit.userId) : null,
    );
    const excluded = user?.shpkNumber === 'excluded';

    let icon: ReactNode;
    if (hit.category === 'people') {
        icon = <Avatar name={hit.title} src={user?.photo} size={34} />;
    } else if (hit.category === 'awards' && hit.awardId) {
        icon = <AwardIcon awardId={hit.awardId} size={32} />;
    } else {
        icon = (
            <span className="grid size-[34px] place-items-center rounded-lg bg-surface-2 text-ink-3 [&_svg]:size-4">
                {hit.action.type === 'command' ? <UserPlus /> : CATEGORY_ICONS[hit.category]}
            </span>
        );
    }

    const matched =
        hit.category === 'awards'
            ? hit.matched && t('search.holders', { count: hit.matched.value })
            : hit.matched && `${hit.matched.label}: ${hit.matched.value}`;

    return (
        <button
            type="button"
            data-index={index}
            onMouseMove={onHover}
            onClick={(e) => onChoose(e.ctrlKey || e.metaKey)}
            className={cn(
                'flex w-full items-center gap-3 px-4 py-2 text-left',
                active ? 'bg-primary-soft' : 'hover:bg-surface-2',
            )}
        >
            {icon}
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">
                        <Highlight text={hit.title} query={query} />
                    </span>
                    {excluded && (
                        <span className="shrink-0 rounded bg-danger-soft px-1.5 text-[10px] font-medium text-danger-ink">
                            {t('search.excluded')}
                        </span>
                    )}
                </span>
                {hit.subtitle && (
                    <span className="block truncate text-xs text-ink-3">
                        <Highlight text={hit.subtitle} query={query} />
                    </span>
                )}
                {matched && (
                    <span className="mt-0.5 block truncate text-[11px] text-ink-2">
                        <Highlight text={matched} query={query} />
                    </span>
                )}
            </span>
            {active && (
                <span className="shrink-0 text-[11px] text-primary-ink">
                    {t(`search.actions.${hit.action.type}`)}
                </span>
            )}
        </button>
    );
}

function EmptyQuery({
    recent,
    sections,
    onRecent,
    onSection,
}: {
    recent: string[];
    sections: SearchSection[];
    onRecent: (query: string) => void;
    onSection: (section: SearchSection) => void;
}) {
    const { t } = useI18nStore();
    return (
        <div className="space-y-4 px-4 py-3">
            <p className="text-[13px] text-ink-3">{t('search.hint')}</p>
            {recent.length > 0 && (
                <div>
                    <p className="eyebrow mb-1.5">{t('search.recent')}</p>
                    <div className="flex flex-wrap gap-1.5">
                        {recent.map((text) => (
                            <button
                                key={text}
                                type="button"
                                onClick={() => onRecent(text)}
                                className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-ink-2 hover:border-primary hover:text-ink"
                            >
                                <Clock className="size-3" />
                                {text}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <div>
                <p className="eyebrow mb-1.5">{t('search.goTo')}</p>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {sections.map((section) => (
                        <button
                            key={section.key}
                            type="button"
                            onClick={() => onSection(section)}
                            className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-[13px] text-ink hover:border-primary hover:bg-primary-soft"
                        >
                            {section.action.type === 'command' ? (
                                <UserPlus className="size-4 text-ink-3" />
                            ) : (
                                <LayoutGrid className="size-4 text-ink-3" />
                            )}
                            <span className="truncate">{section.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

/** The search field in the title bar: shows the shortcut, opens the window. */
export function GlobalSearchButton() {
    const { t } = useI18nStore();
    const show = useGlobalSearch((s) => s.show);
    return (
        <button
            type="button"
            onClick={() => show()}
            title={t('search.buttonTitle')}
            className="mr-2 flex h-8 w-80 max-w-[36vw] items-center gap-2.5 rounded-lg border border-rail-ink-2/20 bg-rail-2/70 px-3 text-[13px] text-rail-ink-2 transition-colors hover:border-rail-ink-2/40 hover:bg-rail-2 hover:text-rail-ink"
        >
            <Search className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left">{t('search.button')}</span>
            <kbd className="hidden shrink-0 rounded border border-rail-ink-2/30 px-1 font-mono text-[10px] md:inline">
                Ctrl K
            </kbd>
        </button>
    );
}
