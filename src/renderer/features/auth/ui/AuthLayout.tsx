import { DatabaseBackup, ShieldCheck, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';

import LogoSvg from '../../../shared/icons/LogoSvg';
import { cn } from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';

/**
 * Screens shown before entering the application: a dark "HQ" panel with the brand on the
 * left (hidden on narrow windows) and the form on the right.
 */
export default function AuthLayout({
    title,
    subtitle,
    children,
    width = 'max-w-md',
}: {
    title: string;
    subtitle?: ReactNode;
    children: ReactNode;
    width?: string;
}) {
    const { t } = useI18nStore();

    return (
        <div className="flex min-h-screen bg-canvas pt-10">
            <aside className="relative hidden w-[42%] max-w-[600px] shrink-0 flex-col justify-between overflow-hidden bg-rail px-12 py-10 text-rail-ink lg:flex">
                <div className="topo absolute -inset-10 text-rail-accent opacity-[0.1]" />
                <CornerTicks />

                <div className="relative flex items-center gap-3">
                    <LogoSvg className="size-11 drop-shadow-[0_2px_4px_rgb(0_0_0/0.35)]" />
                    <div>
                        <p className="text-lg font-semibold tracking-wide">
                            <span className="text-brass">P</span>Manager
                        </p>
                        <p className="text-xs text-rail-ink-2">{t('shell.tagline')}</p>
                    </div>
                </div>

                <div className="relative max-w-md">
                    <h2 className="text-[34px] font-semibold leading-[1.1] tracking-tight">
                        {t('shell.heroTitle')}
                    </h2>
                    <p className="mt-4 text-[15px] leading-relaxed text-rail-ink-2">
                        {t('shell.heroText')}
                    </p>
                    <ul className="mt-8 space-y-3.5">
                        <Feature icon={<WifiOff />}>{t('shell.featureOffline')}</Feature>
                        <Feature icon={<DatabaseBackup />}>{t('shell.featureBackups')}</Feature>
                        <Feature icon={<ShieldCheck />}>{t('shell.featureRoles')}</Feature>
                    </ul>
                </div>

                <p className="relative font-mono text-[11px] uppercase tracking-[0.2em] text-rail-ink-2/70">
                    {t('shell.heroFooter')}
                </p>
            </aside>

            <section className="flex min-w-0 flex-1 items-center justify-center overflow-y-auto px-5 py-10">
                <div className={cn('w-full animate-pop-in', width)}>
                    <div className="mb-6 flex items-center gap-3 lg:hidden">
                        <LogoSvg className="size-10" />
                        <div>
                            <p className="font-semibold text-ink">
                                <span className="text-brass-ink">P</span>Manager
                            </p>
                            <p className="text-xs text-ink-3">{t('shell.tagline')}</p>
                        </div>
                    </div>

                    <h1 className="text-[26px] font-semibold tracking-tight text-ink">{title}</h1>
                    {subtitle && (
                        <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{subtitle}</p>
                    )}

                    <div className="card mt-6 p-6">{children}</div>
                </div>
            </section>
        </div>
    );
}

function Feature({ icon, children }: { icon: ReactNode; children: ReactNode }) {
    return (
        <li className="flex items-center gap-3 text-sm text-rail-ink">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-rail-line bg-rail-2/80 text-rail-accent [&_svg]:size-4">
                {icon}
            </span>
            {children}
        </li>
    );
}

/** Map-frame corner marks. */
function CornerTicks() {
    const tick = 'absolute size-4 border-rail-accent/40';
    return (
        <>
            <span className={cn(tick, 'left-5 top-5 border-l border-t')} />
            <span className={cn(tick, 'right-5 top-5 border-r border-t')} />
            <span className={cn(tick, 'bottom-5 left-5 border-b border-l')} />
            <span className={cn(tick, 'bottom-5 right-5 border-b border-r')} />
        </>
    );
}
