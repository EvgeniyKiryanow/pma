import { ChevronsUpDown, KeyRound, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import MyAccountDialog from '../../features/account/ui/MyAccountDialog';
import { Avatar, cn } from '../../shared/ui';
import { useI18nStore } from '../../stores/i18nStore';
import { usePermissions, useSessionStore } from '../../stores/sessionStore';
import { useNavLayout } from '../../stores/uiStore';
import { TAB_GROUPS, type TabDefinition, type TabKey } from '../navigation';

type Props = {
    tabs: TabDefinition[];
    currentTab: TabKey;
    onSelect: (tab: TabKey) => void;
};

/**
 * Main navigation: the dark "rail" that continues the title bar and frames the workspace.
 * Folds to icons on narrow windows or on demand.
 */
export default function Sidebar({ tabs, currentTab, onSelect }: Props) {
    const { t } = useI18nStore();
    const { collapsed, width, toggle } = useNavLayout();

    return (
        <aside
            className="relative flex shrink-0 flex-col overflow-hidden bg-rail text-rail-ink transition-[width] duration-200 ease-out"
            style={{ width }}
        >
            <div className="topo absolute inset-0 text-rail-accent opacity-[0.045]" />

            <nav className="relative flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-3 pb-3 pt-2">
                {TAB_GROUPS.map((group) => {
                    const items = tabs.filter((tab) => tab.group === group.key);
                    if (items.length === 0) return null;
                    return (
                        <div key={group.key}>
                            {collapsed ? (
                                <div className="mx-auto mb-2 mt-1 h-px w-6 bg-rail-line" />
                            ) : (
                                <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rail-ink-2/70">
                                    {t(group.labelKey)}
                                </p>
                            )}
                            <ul className="space-y-0.5">
                                {items.map((tab) => (
                                    <li key={tab.key}>
                                        <NavItem
                                            tab={tab}
                                            label={tab.label(t)}
                                            active={tab.key === currentTab}
                                            collapsed={collapsed}
                                            onSelect={() => onSelect(tab.key)}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </nav>

            <div className="relative space-y-1 border-t border-rail-line p-3">
                <AccountButton collapsed={collapsed} />
                <button
                    onClick={toggle}
                    title={collapsed ? t('shell.expand') : t('shell.collapse')}
                    className={cn(
                        'flex h-9 w-full items-center gap-3 rounded-lg text-[13px] text-rail-ink-2 transition-colors hover:bg-rail-2 hover:text-rail-ink',
                        collapsed ? 'justify-center' : 'px-3',
                    )}
                >
                    {collapsed ? (
                        <PanelLeftOpen className="size-[18px]" />
                    ) : (
                        <>
                            <PanelLeftClose className="size-[18px]" />
                            <span className="truncate">{t('shell.collapse')}</span>
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
}

function NavItem({
    tab,
    label,
    active,
    collapsed,
    onSelect,
}: {
    tab: TabDefinition;
    label: string;
    active: boolean;
    collapsed: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            onClick={onSelect}
            title={collapsed ? label : undefined}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'group relative flex h-10 w-full items-center gap-3 rounded-lg text-[13.5px] font-medium transition-colors',
                collapsed ? 'justify-center' : 'px-3',
                active
                    ? 'bg-rail-3 text-rail-ink'
                    : 'text-rail-ink-2 hover:bg-rail-2 hover:text-rail-ink',
            )}
        >
            <span
                className={cn(
                    'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full transition-all',
                    active ? 'bg-rail-accent opacity-100' : 'opacity-0',
                    collapsed && '-left-3',
                )}
            />
            <span
                className={cn(
                    'shrink-0 [&_svg]:size-[18px]',
                    active ? 'text-rail-accent' : 'text-rail-ink-2 group-hover:text-rail-ink',
                )}
            >
                {tab.icon}
            </span>
            {!collapsed && <span className="truncate">{label}</span>}
        </button>
    );
}

function AccountButton({ collapsed }: { collapsed: boolean }) {
    const { t } = useI18nStore();
    const { session } = usePermissions();
    const logout = useSessionStore((s) => s.logout);
    const [menuOpen, setMenuOpen] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
        };
        const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    if (!session) return null;
    const name = session.displayName || session.username;

    return (
        <div ref={rootRef} className="relative">
            <button
                onClick={() => setMenuOpen((open) => !open)}
                title={collapsed ? `${name} · ${session.roleName}` : undefined}
                className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg py-1.5 text-left transition-colors hover:bg-rail-2',
                    collapsed ? 'justify-center' : 'px-2',
                    menuOpen && 'bg-rail-2',
                )}
            >
                <Avatar name={name} size={32} rounded="rounded-lg" />
                {!collapsed && (
                    <>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-rail-ink">
                                {name}
                            </span>
                            <span className="block truncate text-[11px] text-rail-ink-2">
                                {session.roleName}
                            </span>
                        </span>
                        <ChevronsUpDown className="size-4 shrink-0 text-rail-ink-2" />
                    </>
                )}
            </button>

            {menuOpen && (
                <div
                    className={cn(
                        'absolute bottom-full z-[70] mb-2 w-56 animate-pop-in overflow-hidden rounded-xl border border-line bg-surface p-1 text-ink shadow-pop',
                        collapsed ? 'left-0' : 'inset-x-0 w-auto',
                    )}
                >
                    <div className="px-3 pb-2 pt-2">
                        <p className="truncate text-[13px] font-semibold">{name}</p>
                        <p className="truncate text-xs text-ink-3">
                            {session.username} · {session.roleName}
                        </p>
                    </div>
                    <div className="my-1 h-px bg-line" />
                    <MenuItem
                        icon={<KeyRound className="size-4" />}
                        onClick={() => {
                            setMenuOpen(false);
                            setDialogOpen(true);
                        }}
                    >
                        {t('shell.account')}
                    </MenuItem>
                    <MenuItem
                        icon={<LogOut className="size-4" />}
                        danger
                        onClick={() => void logout()}
                    >
                        {t('session.logout')}
                    </MenuItem>
                </div>
            )}

            {dialogOpen && <MyAccountDialog onClose={() => setDialogOpen(false)} />}
        </div>
    );
}

function MenuItem({
    icon,
    children,
    onClick,
    danger,
}: {
    icon: React.ReactNode;
    children: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] transition-colors',
                danger ? 'text-danger-ink hover:bg-danger-soft' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
            )}
        >
            {icon}
            {children}
        </button>
    );
}
