import { Download, Maximize2, Minus, Moon, RotateCcw, Sun, X, ZoomIn, ZoomOut } from 'lucide-react';
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';

import { useI18nStore } from '../../stores/i18nStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useUiStore } from '../../stores/uiStore';
import { systemApi } from '../api/system';
import LogoSvg from '../icons/LogoSvg';
import { cn, IconButton } from '../ui';
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
    const isSignedIn = useSessionStore((s) => s.status === 'ready');
    const { resolvedTheme, toggleTheme, zoom, zoomIn, zoomOut, resetZoom } = useUiStore();

    useEffect(() => {
        void systemApi.getVersion().then(setVersion);
    }, []);

    const handleCheckUpdate = async () => {
        setChecking(true);
        try {
            const result = await systemApi.checkForUpdates();
            if (result.status === 'error')
                toast.error(`${t('titleBar.updateError')}: ${result.message}`);
            else toast.info(t('titleBar.updateStarted'));
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
                {isSignedIn && (
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
                    label={t('shell.fullscreen')}
                    onClick={() => systemApi.toggleFullScreen()}
                >
                    <Maximize2 className="size-3.5" />
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
