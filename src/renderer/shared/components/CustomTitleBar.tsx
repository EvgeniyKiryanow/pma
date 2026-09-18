import {
    Copy,
    Download,
    Minus,
    Moon,
    RotateCcw,
    Square,
    Sun,
    X,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';

import { useI18nStore } from '../../stores/i18nStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useUiStore } from '../../stores/uiStore';
import { reportError } from '../api/errors';
import { systemApi } from '../api/system';
import LogoSvg from '../icons/LogoSvg';
import { cn, IconButton } from '../ui';
import { runBlocking } from '../ui/blockingTask';
import { confirmAction } from '../ui/confirm';
import { toast } from '../ui/toast';

const drag = { WebkitAppRegion: 'drag' } as CSSProperties;
const noDrag = { WebkitAppRegion: 'no-drag' } as CSSProperties;

/**
 * Frameless window title bar: brand, interface scale, theme and window controls.
 * `leading` / `trailing` let the signed-in shell add its own items (section, alerts).
 * Data operations (restore, reset) live in the Backups section behind permissions.
 */
export default function CustomTitleBar({
    leading,
    trailing,
    brandWidth,
}: {
    leading?: ReactNode;
    trailing?: ReactNode;
    /** Width of the brand block, so it lines up with the navigation panel below. */
    brandWidth?: number;
}) {
    const { t } = useI18nStore();
    const [version, setVersion] = useState('');
    const [checking, setChecking] = useState(false);
    // An empty installation (first run, or after everything was destroyed) can update too.
    const canUpdate = useSessionStore((s) => s.status === 'ready' || s.status === 'setup');
    const { resolvedTheme, toggleTheme, zoom, zoomIn, zoomOut, resetZoom } = useUiStore();

    useEffect(() => {
        void systemApi.getVersion().then(setVersion);
    }, []);

    // Maximizing also happens by double-clicking the bar or with Win+Arrow: follow the window.
    const [maximized, setMaximized] = useState(true);
    useEffect(() => {
        let timer: number | undefined;
        const update = () => {
            systemApi
                .isMaximized()
                .then(setMaximized)
                .catch(() => undefined);
        };
        const onResize = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(update, 120);
        };
        update();
        window.addEventListener('resize', onResize);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    const handleCheckUpdate = async () => {
        setChecking(true);
        try {
            const update = await systemApi.checkForUpdates();
            const version = update.version;
            if (update.status === 'current') {
                toast.success(t('titleBar.updateCurrent', { version }));
                return;
            }
            if (!update.canInstall) {
                toast.info(t('titleBar.updateManual', { version }));
                return;
            }
            const confirmed = await confirmAction({
                title: t('titleBar.updateAvailableTitle', { version }),
                message: t('titleBar.updateAvailableText'),
                confirmLabel: t('titleBar.updateInstall'),
                tone: 'primary',
            });
            if (!confirmed) return;
            // Window-wide: nothing may be edited while the app is about to restart.
            await runBlocking(t('titleBar.updateDownloading', { version }), () =>
                systemApi.installUpdate(),
            );
            toast.info(t('titleBar.updateRestarting'));
        } catch (error) {
            reportError(error);
        } finally {
            setChecking(false);
        }
    };

    const collapsed = brandWidth !== undefined && brandWidth < 120;

    return (
        <div
            className="fixed inset-x-0 top-0 z-[80] flex h-10 select-none items-stretch bg-rail text-rail-ink"
            style={drag}
        >
            {/* Brand */}
            <div
                className={cn(
                    'flex shrink-0 items-center gap-2.5 transition-[width] duration-200',
                    collapsed ? 'justify-center px-0' : 'px-4',
                )}
                style={brandWidth !== undefined ? { width: brandWidth } : undefined}
            >
                <LogoSvg className="size-[22px] shrink-0 drop-shadow-[0_1px_1px_rgb(0_0_0/0.35)]" />
                {!collapsed && (
                    <div className="flex min-w-0 items-baseline gap-2">
                        <span className="text-[13px] font-semibold tracking-wide">
                            <span className="text-brass">P</span>Manager
                        </span>
                        {version && (
                            <span className="font-mono text-[10px] text-rail-ink-2">
                                v{version}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-3 px-3">{leading}</div>

            {/* Tools */}
            <div className="flex items-center gap-1 pr-2" style={noDrag}>
                {trailing}

                <div
                    className="ml-1 hidden items-center rounded-lg bg-rail-2/70 p-0.5 sm:flex"
                    title={t('shell.zoomTitle')}
                >
                    <IconButton
                        variant="rail"
                        size="xs"
                        label={t('shell.zoomOut')}
                        onClick={zoomOut}
                        icon={<ZoomOut className="size-3.5" />}
                    />
                    <button
                        onClick={resetZoom}
                        title={t('shell.zoomReset')}
                        className="h-7 min-w-[46px] rounded-md px-1 font-mono text-[11px] tabular-nums text-rail-ink-2 transition-colors hover:bg-rail-3 hover:text-rail-ink"
                    >
                        {Math.round(zoom * 100)}%
                    </button>
                    <IconButton
                        variant="rail"
                        size="xs"
                        label={t('shell.zoomIn')}
                        onClick={zoomIn}
                        icon={<ZoomIn className="size-3.5" />}
                    />
                </div>

                <IconButton
                    variant="rail"
                    size="sm"
                    label={
                        resolvedTheme === 'dark' ? t('shell.themeToLight') : t('shell.themeToDark')
                    }
                    onClick={toggleTheme}
                    icon={
                        resolvedTheme === 'dark' ? (
                            <Sun className="size-4 text-brass" />
                        ) : (
                            <Moon className="size-4" />
                        )
                    }
                />
                {canUpdate && (
                    <IconButton
                        variant="rail"
                        size="sm"
                        label={t('shell.updates')}
                        onClick={() => void handleCheckUpdate()}
                        disabled={checking}
                        icon={<Download className={cn('size-4', checking && 'animate-pulse')} />}
                    />
                )}
                <IconButton
                    variant="rail"
                    size="sm"
                    label={t('shell.reload')}
                    onClick={() => window.location.reload()}
                    icon={<RotateCcw className="size-4" />}
                />
            </div>

            {/* Window controls */}
            <div className="flex items-stretch border-l border-rail-line" style={noDrag}>
                <WindowButton label={t('shell.minimize')} onClick={() => void systemApi.minimize()}>
                    <Minus className="size-4" />
                </WindowButton>
                <WindowButton
                    label={maximized ? t('shell.restoreDown') : t('shell.maximize')}
                    onClick={() => systemApi.toggleMaximize()}
                >
                    {maximized ? (
                        <Copy className="size-3.5 -scale-x-100" />
                    ) : (
                        <Square className="size-3" />
                    )}
                </WindowButton>
                <WindowButton label={t('shell.close')} onClick={() => systemApi.close()} danger>
                    <X className="size-4" />
                </WindowButton>
            </div>
        </div>
    );
}

function WindowButton({
    label,
    onClick,
    danger,
    children,
}: {
    label: string;
    onClick: () => void;
    danger?: boolean;
    children: ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            title={label}
            aria-label={label}
            className={cn(
                'grid w-[46px] place-items-center text-rail-ink-2 transition-colors',
                danger
                    ? 'hover:bg-[oklch(57%_0.2_27)] hover:text-[oklch(99%_0_0)]'
                    : 'hover:bg-rail-2 hover:text-rail-ink',
            )}
        >
            {children}
        </button>
    );
}
