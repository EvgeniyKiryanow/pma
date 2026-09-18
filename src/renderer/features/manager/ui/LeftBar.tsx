import { List, ListTree, Loader2, PanelLeftClose, PanelLeftOpen, SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { User } from '../../../../shared/types/user';
import { useShtatniStore } from '../../../entities/shtatna-posada/model/useShtatniStore';
import { personnelApi } from '../../../shared/api/personnel';
import { StatusDot } from '../../../shared/components/StatusBadge';
import { Avatar, cn, EmptyState, IconButton, SearchInput } from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';
import { useUserStore } from '../../../stores/userStore';
import StaffView from './StaffView';

type Props = {
    users: User[];
};

type View = 'list' | 'staff';

/** The chosen view is a per-computer convenience. */
function readView(): View {
    try {
        return localStorage.getItem('personnelView') === 'staff' ? 'staff' : 'list';
    } catch {
        return 'list';
    }
}

function saveView(view: View): void {
    try {
        localStorage.setItem('personnelView', view);
    } catch {
        // storage unavailable: the view still switches for this session
    }
}

function matchesSearch(user: User, search: string): boolean {
    if (!search) return true;
    const fields = [
        user.fullName,
        user.rank,
        user.id.toString(),
        user.phoneNumber,
        user.email,
        user.dateOfBirth,
        user.awards,
        user.education,
        user.position,
        user.rights,
        user.conscriptionInfo,
        user.notes,
        user.callsign,
        user.soldierStatus,
    ];
    const relativesText =
        user.relatives
            ?.map((r) => `${r.name} ${r.relationship} ${r.phone}`)
            .join(' ')
            .toLowerCase() || '';
    return (
        fields.some((field) => field?.toLowerCase().includes(search)) ||
        relativesText.includes(search)
    );
}

/** Personnel roster: search and a compact list; selecting a person opens the dossier. */
export default function LeftBar({ users }: Props) {
    const [filter, setFilter] = useState('');
    const [view, setView] = useState<View>(readView);
    const positions = useShtatniStore((s) => s.shtatniPosady);
    const chooseView = (next: View) => {
        setView(next);
        saveView(next);
    };
    const [loadingUserId, setLoadingUserId] = useState<number | null>(null);

    const selectedUser = useUserStore((s) => s.selectedUser);
    const setSelectedUser = useUserStore((s) => s.setSelectedUser);
    const { t } = useI18nStore();

    const collapsed = useUserStore((s) => s.sidebarCollapsed);
    const setCollapsed = useUserStore((s) => s.setSidebarCollapsed);

    const search = filter.trim().toLowerCase();
    const filteredUsers = useMemo(
        () => users.filter((user) => matchesSearch(user, search)),
        [users, search],
    );

    const handleUserClick = async (user: User) => {
        if (selectedUser?.id === user.id) {
            setSelectedUser(null);
            return;
        }
        setLoadingUserId(user.id);
        try {
            const fullUser = await personnelApi.get(user.id);
            setSelectedUser(fullUser);
        } finally {
            setLoadingUserId(null);
        }
    };

    if (collapsed) {
        return (
            <div className="flex w-12 shrink-0 flex-col items-center gap-3 border-r border-line bg-surface py-3">
                <IconButton
                    label="Показати список"
                    size="sm"
                    onClick={() => setCollapsed(false)}
                    icon={<PanelLeftOpen className="size-4" />}
                />
                <button
                    onClick={() => setCollapsed(false)}
                    className="flex flex-1 flex-col items-center gap-2 text-ink-3 hover:text-ink"
                >
                    <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">
                        {users.length}
                    </span>
                    <span className="text-xs font-medium tracking-wide [writing-mode:vertical-rl]">
                        {t('leftBar.title')}
                    </span>
                </button>
            </div>
        );
    }

    return (
        <div className="flex w-[300px] shrink-0 flex-col border-r border-line bg-surface xl:w-[320px]">
            <div className="space-y-3 border-b border-line px-3 pb-3 pt-3.5">
                <div className="flex items-center justify-between gap-2 pl-1">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                            {t('leftBar.title')}
                        </p>
                        <p className="text-xs text-ink-3">
                            {search
                                ? `Знайдено ${filteredUsers.length} з ${users.length}`
                                : `${t('leftBar.total')}: ${users.length}`}
                        </p>
                    </div>
                    <IconButton
                        label="Згорнути список"
                        size="sm"
                        onClick={() => setCollapsed(true)}
                        icon={<PanelLeftClose className="size-4" />}
                    />
                </div>
                <div
                    className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-0.5"
                    role="tablist"
                >
                    {(
                        [
                            ['list', 'За списком', <List key="list" className="size-3.5" />],
                            ['staff', 'Штат', <ListTree key="staff" className="size-3.5" />],
                        ] as const
                    ).map(([value, label, icon]) => (
                        <button
                            key={value}
                            role="tab"
                            aria-selected={view === value}
                            onClick={() => chooseView(value)}
                            className={cn(
                                'flex items-center justify-center gap-1.5 rounded-md py-1 text-[13px] font-medium transition-colors',
                                view === value
                                    ? 'bg-surface text-ink shadow-sm'
                                    : 'text-ink-3 hover:text-ink',
                            )}
                        >
                            {icon}
                            {label}
                        </button>
                    ))}
                </div>
                <SearchInput
                    value={filter}
                    onChange={setFilter}
                    placeholder={t('leftBar.searchPlaceholder')}
                    size="sm"
                />
            </div>

            {view === 'staff' ? (
                <div className="flex-1 overflow-y-auto">
                    <StaffView
                        users={users}
                        positions={positions}
                        search={search}
                        selectedId={selectedUser?.id ?? null}
                        loadingId={loadingUserId}
                        onSelect={(user) => void handleUserClick(user)}
                    />
                </div>
            ) : (
                <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
                    {filteredUsers.length === 0 ? (
                        <li>
                            <EmptyState
                                icon={<SearchX />}
                                title={t('leftBar.noUsersFound')}
                                description={search ? 'Спробуйте інший запит.' : undefined}
                            />
                        </li>
                    ) : (
                        filteredUsers.map((user, index) => {
                            const isSelected = selectedUser?.id === user.id;
                            const isLoading = loadingUserId === user.id;
                            const meta = [user.rank, user.position].filter(Boolean).join(' · ');
                            return (
                                <li key={user.id}>
                                    <button
                                        onClick={() => void handleUserClick(user)}
                                        disabled={isLoading}
                                        title={
                                            user.phoneNumber ? `☎ ${user.phoneNumber}` : undefined
                                        }
                                        className={cn(
                                            'group relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors',
                                            isSelected ? 'bg-primary-soft' : 'hover:bg-surface-2',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-r-full transition-colors',
                                                isSelected ? 'bg-primary' : 'bg-transparent',
                                            )}
                                        />
                                        <span className="relative">
                                            <Avatar
                                                name={user.fullName}
                                                src={user.photo}
                                                size={38}
                                                rounded="rounded-xl"
                                            />
                                            {isLoading && (
                                                <span className="absolute inset-0 grid place-items-center rounded-xl bg-surface/70">
                                                    <Loader2 className="size-4 animate-spin text-primary" />
                                                </span>
                                            )}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span
                                                className={cn(
                                                    'block truncate text-[13.5px] font-semibold leading-snug',
                                                    isSelected ? 'text-primary-ink' : 'text-ink',
                                                )}
                                            >
                                                {user.fullName}
                                            </span>
                                            {meta && (
                                                <span className="block truncate text-xs text-ink-3">
                                                    {meta}
                                                </span>
                                            )}
                                            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-2">
                                                <StatusDot status={user.soldierStatus} />
                                                <span className="truncate">
                                                    {user.soldierStatus || 'Без статусу'}
                                                </span>
                                            </span>
                                        </span>
                                        <span className="self-start pt-0.5 font-mono text-[10px] tabular-nums text-ink-3">
                                            {index + 1}
                                        </span>
                                    </button>
                                </li>
                            );
                        })
                    )}
                </ul>
            )}
        </div>
    );
}
