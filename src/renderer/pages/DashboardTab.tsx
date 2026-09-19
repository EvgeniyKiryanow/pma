import { CalendarClock, FolderOpen, NotebookPen, Search, UserPlus, Users } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { DIRECTIVE_TYPES, type DirectiveRecord } from '../../shared/types/directive';
import type { RecentFile } from '../../shared/types/documents';
import type { RecentStatusChange, StatusPeriodEntry } from '../../shared/types/history';
import {
    UPCOMING_AHEAD,
    UPCOMING_BEHIND,
    upcomingEvents,
} from '../features/dashboard/model/upcoming';
import {
    JournalCard,
    openJournal,
    RecentFilesCard,
    StatusChangesCard,
    UpcomingCard,
} from '../features/dashboard/ui/DashboardCards';
import { journalCounts, useJournalStore } from '../features/journal/model/journalStore';
import { isoDay } from '../features/report/model/namedListDays';
import { useGlobalSearch } from '../features/search/model/searchStore';
import { directivesApi } from '../shared/api/directives';
import { documentsApi } from '../shared/api/documents';
import { reportError } from '../shared/api/errors';
import { historyApi } from '../shared/api/personnel';
import { Button, cn } from '../shared/ui';
import { Loader } from '../shared/ui/loader';
import { useI18nStore } from '../stores/i18nStore';
import { usePermissions, useSessionStore } from '../stores/sessionStore';
import { useUserStore } from '../stores/userStore';

function Tile({
    icon,
    label,
    value,
    hint,
    tone,
    onClick,
    loading,
}: {
    icon: ReactNode;
    label: string;
    value: number | string;
    hint?: string;
    tone?: 'danger' | 'warning';
    onClick?: () => void;
    loading?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="card flex items-center gap-3 px-4 py-3 text-left transition-colors hover:border-primary"
        >
            <span
                className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-xl [&_svg]:size-5',
                    tone === 'danger'
                        ? 'bg-danger-soft text-danger-ink'
                        : tone === 'warning'
                          ? 'bg-warning-soft text-warning-ink'
                          : 'bg-primary-soft text-primary-ink',
                )}
            >
                {icon}
            </span>
            <span className="min-w-0">
                <span className="block truncate text-xs text-ink-3">{label}</span>
                <span className="block text-xl font-semibold tabular-nums text-ink">
                    {loading ? <Loader size="sm" className="my-1" /> : value}
                </span>
                {hint && <span className="block truncate text-[11px] text-ink-3">{hint}</span>}
            </span>
        </button>
    );
}

/**
 * «Робочий стіл»: what needs attention today — dates that come, tasks of the journal, the
 * latest status changes and the files added lately. Everything opens where it lives.
 */
export default function DashboardTab() {
    const { t } = useI18nStore();
    const { can } = usePermissions();
    const account = useSessionStore((s) => s.session?.displayName || s.session?.username);
    const users = useUserStore((s) => s.users);
    const historyVersion = useUserStore((s) => s.historyVersion);
    const journal = useJournalStore((s) => s.entries);
    const [periods, setPeriods] = useState<StatusPeriodEntry[]>([]);
    const [orders, setOrders] = useState<DirectiveRecord[]>([]);
    const [changes, setChanges] = useState<RecentStatusChange[]>([]);
    const [files, setFiles] = useState<RecentFile[]>([]);
    const canPeople = can('personnel.view');
    const canOrders = can('directives.view');
    const journalLoaded = useJournalStore((s) => s.loaded);
    const usersLoaded = useUserStore((s) => s.usersLoaded);
    // The first load of each source shows a loader in its card; later refreshes keep the
    // content on screen.
    const [waiting, setWaiting] = useState({
        periods: true,
        orders: true,
        changes: true,
        files: true,
    });
    const loaded = (key: keyof typeof waiting) => () =>
        setWaiting((state) => (state[key] ? { ...state, [key]: false } : state));

    useEffect(() => {
        useJournalStore
            .getState()
            .load()
            .catch((err) => reportError(err, { context: 'dashboard.journal' }));
    }, []);

    useEffect(() => {
        if (!canPeople) return;
        const quiet = (err: unknown) => reportError(err, { context: 'dashboard.load' });
        // Only the periods that can end within the window of «Найближчі дати».
        const day = (shift: number) => isoDay(new Date(Date.now() + shift * 86_400_000));
        historyApi
            .statusPeriods({ from: day(-UPCOMING_BEHIND - 1), to: day(UPCOMING_AHEAD + 1) })
            .then(setPeriods)
            .finally(loaded('periods'))
            .catch(quiet);
        historyApi.recentStatusChanges(40).then(setChanges).finally(loaded('changes')).catch(quiet);
        documentsApi.recent(25).then(setFiles).finally(loaded('files')).catch(quiet);
        if (canOrders) {
            Promise.all(DIRECTIVE_TYPES.map((type) => directivesApi.list(type)))
                .then((lists) => setOrders(lists.flat()))
                .finally(loaded('orders'))
                .catch(quiet);
        } else {
            loaded('orders')();
        }
        // Booleans only: `can` is a new function on every render and would reload endlessly.
    }, [canPeople, canOrders, historyVersion, users]);

    const events = useMemo(
        () => upcomingEvents({ users: canPeople ? users : [], periods, orders, journal }),
        [users, periods, orders, journal, canPeople],
    );
    const counts = useMemo(() => journalCounts(journal), [journal]);
    const upcomingLoading =
        !journalLoaded || (canPeople && (!usersLoaded || waiting.periods || waiting.orders));
    const serving = users.filter(
        (u) => u.shpkNumber !== 'excluded' && !String(u.shpkNumber ?? '').includes('order'),
    ).length;
    const weekEvents = events.filter((e) => e.kind !== 'journal' && e.daysLeft <= 7).length;
    const weekAgo = Date.now() - 7 * 86_400_000;
    const newFiles = files.filter((f) => new Date(f.date).getTime() >= weekAgo).length;

    const hour = new Date().getHours();
    const greeting =
        hour < 6
            ? t('dashboard.greeting.night')
            : hour < 12
              ? t('dashboard.greeting.morning')
              : hour < 18
                ? t('dashboard.greeting.day')
                : t('dashboard.greeting.evening');
    const today = new Date().toLocaleDateString('uk-UA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <div className="@container min-h-0 flex-1 overflow-auto">
            <div className="mx-auto max-w-[1600px] space-y-5 p-5">
                <header className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-ink">
                            {greeting}
                            {account ? `, ${account}` : ''}
                        </h1>
                        <p className="mt-1 text-sm text-ink-3">
                            {today.charAt(0).toUpperCase() + today.slice(1)}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="secondary"
                            icon={<Search className="size-4" />}
                            onClick={() => useGlobalSearch.getState().show()}
                        >
                            {t('dashboard.actions.search')}
                        </Button>
                        {can('personnel.create') && (
                            <Button
                                variant="secondary"
                                icon={<UserPlus className="size-4" />}
                                onClick={() => {
                                    useUserStore.getState().setCurrentTab('manager');
                                    useUserStore.getState().openUserFormForAdd();
                                }}
                            >
                                {t('dashboard.actions.addPerson')}
                            </Button>
                        )}
                        <Button
                            icon={<NotebookPen className="size-4" />}
                            onClick={() => openJournal('new')}
                        >
                            {t('dashboard.actions.addNote')}
                        </Button>
                    </div>
                </header>

                <div className="grid grid-cols-2 gap-3 @4xl:grid-cols-4">
                    {canPeople && (
                        <Tile
                            icon={<Users />}
                            label={t('dashboard.tiles.people')}
                            value={serving}
                            hint={t('dashboard.tiles.peopleHint', { total: users.length })}
                            loading={!usersLoaded}
                            onClick={() => useUserStore.getState().setCurrentTab('manager')}
                        />
                    )}
                    <Tile
                        icon={<CalendarClock />}
                        label={t('dashboard.tiles.dates')}
                        value={weekEvents}
                        hint={t('dashboard.tiles.datesHint')}
                        loading={upcomingLoading}
                        tone={
                            events.some((e) => e.daysLeft < 0 && e.kind !== 'journal')
                                ? 'warning'
                                : undefined
                        }
                    />
                    <Tile
                        icon={<NotebookPen />}
                        label={t('dashboard.tiles.tasks')}
                        value={counts.today}
                        hint={
                            counts.overdue
                                ? t('dashboard.tiles.overdue', { count: counts.overdue })
                                : t('dashboard.tiles.tasksHint')
                        }
                        tone={counts.overdue ? 'danger' : undefined}
                        loading={!journalLoaded}
                        onClick={() => useUserStore.getState().setCurrentTab('journal')}
                    />
                    {canPeople && (
                        <Tile
                            icon={<FolderOpen />}
                            label={t('dashboard.tiles.files')}
                            value={newFiles}
                            hint={t('dashboard.tiles.filesHint')}
                            loading={waiting.files}
                        />
                    )}
                </div>

                <div className="grid grid-cols-1 gap-5 @5xl:grid-cols-2">
                    <UpcomingCard events={events} loading={upcomingLoading} />
                    <JournalCard entries={journal} loading={!journalLoaded} />
                    {canPeople && (
                        <StatusChangesCard
                            changes={changes}
                            loading={waiting.changes || !usersLoaded}
                        />
                    )}
                    {canPeople && <RecentFilesCard files={files} loading={waiting.files} />}
                </div>
            </div>
        </div>
    );
}
