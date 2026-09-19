import { CheckCircle2, CircleAlert, FileSpreadsheet, UserPlus, UserRoundPen } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import type { User } from '../../../../../shared/types/user';
import { cardHistoryEntries } from '../../../../entities/user/model/cardHistory';
import { reportError } from '../../../../shared/api/errors';
import { historyApi, personnelApi } from '../../../../shared/api/personnel';
import { Badge, Button, Checkbox, cn } from '../../../../shared/ui';
import { runBlocking } from '../../../../shared/ui/blockingTask';
import { confirmAction } from '../../../../shared/ui/confirm';
import { toast } from '../../../../shared/ui/toast';
import { useI18nStore } from '../../../../stores/i18nStore';
import { useUserStore } from '../../../../stores/userStore';
import {
    detectImpulseSheet,
    planImpulseImport,
    readImpulseEducation,
    readImpulsePersonnel,
    type SheetRows,
} from '../../model/impulseImport';

/** Names shown in a list before «і ще N». */
const SHOWN = 30;

/**
 * Import of a workbook of Impulse Toolkit: what the file holds, what would change in the
 * cards, then the import itself. Every changed card gets the usual entry in its history.
 */
export function ImpulseImportPanel({ sheets }: { sheets: Record<string, SheetRows> }) {
    const { t } = useI18nStore();
    const [existing, setExisting] = useState<User[] | null>(null);
    const [createMissing, setCreateMissing] = useState(false);
    const [busy, setBusy] = useState(false);

    const reload = () =>
        personnelApi
            .list()
            .then(setExisting)
            .catch((err) => {
                setExisting([]);
                reportError(err, { context: 'impulse-import.people' });
            });
    useEffect(() => void reload(), []);

    const read = useMemo(() => {
        const people = [];
        const education = [];
        for (const rows of Object.values(sheets)) {
            const layout = detectImpulseSheet(rows);
            if (layout?.kind === 'personnel') people.push(...readImpulsePersonnel(rows, layout));
            if (layout?.kind === 'education') education.push(...readImpulseEducation(rows, layout));
        }
        return { people, education };
    }, [sheets]);

    const plan = useMemo(
        () =>
            existing
                ? planImpulseImport(read.people, read.education, existing, { createMissing })
                : null,
        [read, existing, createMissing],
    );

    const fieldLabel = (key: string) => {
        const label = t(`card.fields.${key}`);
        return label === `card.fields.${key}` ? key : label;
    };

    const run = async () => {
        if (!plan) return;
        const confirmed = await confirmAction({
            title: t('impulseImport.confirmTitle'),
            message: t('impulseImport.confirmText', {
                created: plan.create.length,
                updated: plan.update.length,
            }),
            confirmLabel: t('impulseImport.confirm'),
            tone: 'primary',
        });
        if (!confirmed) return;
        setBusy(true);
        let created = 0;
        let updated = 0;
        let failed = 0;
        try {
            await runBlocking(t('impulseImport.progress'), async () => {
                for (const card of plan.create) {
                    try {
                        await personnelApi.create(card as Omit<User, 'id'>);
                        created++;
                    } catch (err) {
                        failed++;
                        reportError(err, { context: 'impulse-import.create' });
                    }
                }
                for (const change of plan.update) {
                    try {
                        const saved = await personnelApi.update(change.next);
                        for (const entry of cardHistoryEntries(change.user, saved, t)) {
                            await historyApi.add(saved.id, entry);
                        }
                        updated++;
                    } catch (err) {
                        failed++;
                        reportError(err, { context: 'impulse-import.update' });
                    }
                }
            });
        } finally {
            setBusy(false);
            await useUserStore.getState().fetchUsers();
            useUserStore.setState((state) => ({ historyVersion: state.historyVersion + 1 }));
            await reload();
        }
        const summary = t('impulseImport.done', { created, updated });
        if (failed) toast.warning(`${summary}\n${t('impulseImport.failed', { count: failed })}`);
        else toast.success(summary);
    };

    const nothing = plan && !plan.create.length && !plan.update.length;

    return (
        <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink">
                        <FileSpreadsheet className="size-[18px]" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{t('impulseImport.title')}</p>
                        <p className="text-xs text-ink-3">
                            {t('impulseImport.contents', {
                                people: read.people.length,
                                education: read.education.length,
                            })}
                        </p>
                    </div>
                    <Badge tone="olive">{t('impulseImport.badge')}</Badge>
                </div>
                <Button
                    size="sm"
                    loading={busy}
                    disabled={!plan || Boolean(nothing) || busy}
                    icon={<UserRoundPen className="size-4" />}
                    onClick={() => void run()}
                >
                    {t('impulseImport.run')}
                </Button>
            </div>

            {!plan ? (
                <p className="px-5 py-4 text-sm text-ink-3">{t('impulseImport.comparing')}</p>
            ) : (
                <div className="space-y-4 px-5 py-4">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Stat
                            icon={<UserPlus />}
                            label={t('impulseImport.created')}
                            value={plan.create.length}
                        />
                        <Stat
                            icon={<UserRoundPen />}
                            label={t('impulseImport.updated')}
                            value={plan.update.length}
                        />
                        <Stat
                            icon={<CheckCircle2 />}
                            label={t('impulseImport.unchanged')}
                            value={plan.unchanged}
                            muted
                        />
                        <Stat
                            icon={<CircleAlert />}
                            label={t('impulseImport.attention')}
                            value={plan.ambiguous.length + plan.unmatched.length}
                            warn={plan.ambiguous.length + plan.unmatched.length > 0}
                        />
                    </div>

                    {nothing && <p className="text-sm text-ink-2">{t('impulseImport.nothing')}</p>}

                    {/* What needs a decision first, then what will change. */}
                    {plan.ambiguous.length > 0 && (
                        <NameList
                            title={t('impulseImport.ambiguous')}
                            items={plan.ambiguous.map((row) =>
                                t('impulseImport.ambiguousRow', {
                                    name: row.fullName,
                                    row: row.row,
                                    sheet: t(
                                        row.sheet === 'personnel'
                                            ? 'impulseImport.sheetPersonnel'
                                            : 'impulseImport.sheetEducation',
                                    ),
                                }),
                            )}
                            warn
                        />
                    )}
                    {(plan.unmatched.length > 0 || createMissing) && (
                        <div className="space-y-2">
                            {plan.unmatched.length > 0 && (
                                <NameList
                                    title={t('impulseImport.unmatched')}
                                    items={plan.unmatched.map((row) =>
                                        t('impulseImport.unmatchedRow', {
                                            name: row.fullName,
                                            row: row.row,
                                        }),
                                    )}
                                    warn
                                />
                            )}
                            <Checkbox
                                checked={createMissing}
                                onChange={setCreateMissing}
                                label={t('impulseImport.createMissing')}
                                description={t('impulseImport.createMissingHint')}
                            />
                        </div>
                    )}
                    {plan.update.length > 0 && (
                        <NameList
                            title={t('impulseImport.changes')}
                            items={plan.update.map(
                                (change) =>
                                    `${change.user.fullName}: ${change.fields.map(fieldLabel).join(', ')}`,
                            )}
                        />
                    )}
                    {plan.create.length > 0 && (
                        <NameList
                            title={t('impulseImport.newCards')}
                            items={plan.create.map((card) => String(card.fullName ?? ''))}
                        />
                    )}
                </div>
            )}
        </section>
    );
}

function Stat({
    icon,
    label,
    value,
    muted,
    warn,
}: {
    icon: ReactNode;
    label: string;
    value: number;
    muted?: boolean;
    warn?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex items-center gap-3 rounded-xl border border-line px-3 py-2.5',
                warn ? 'bg-warning-soft' : 'bg-surface-2',
            )}
        >
            <span
                className={cn(
                    '[&_svg]:size-4',
                    warn ? 'text-warning-ink' : muted ? 'text-ink-3' : 'text-primary-ink',
                )}
            >
                {icon}
            </span>
            <div>
                <p className="font-mono text-lg font-semibold tabular-nums text-ink">{value}</p>
                <p className="text-xs text-ink-3">{label}</p>
            </div>
        </div>
    );
}

function NameList({ title, items, warn }: { title: string; items: string[]; warn?: boolean }) {
    const { t } = useI18nStore();
    const [all, setAll] = useState(false);
    const shown = all ? items : items.slice(0, SHOWN);
    return (
        <div>
            <p
                className={cn(
                    'mb-1 text-xs font-semibold',
                    warn ? 'text-warning-ink' : 'text-ink-2',
                )}
            >
                {title} ({items.length})
            </p>
            <ul className="max-h-56 space-y-0.5 overflow-y-auto rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink-2">
                {shown.map((item, index) => (
                    <li key={index}>{item}</li>
                ))}
            </ul>
            {items.length > SHOWN && (
                <button
                    type="button"
                    className="mt-1 text-xs font-medium text-primary-ink hover:underline"
                    onClick={() => setAll(!all)}
                >
                    {all
                        ? t('impulseImport.collapse')
                        : t('impulseImport.showAll', { count: items.length - SHOWN })}
                </button>
            )}
        </div>
    );
}
