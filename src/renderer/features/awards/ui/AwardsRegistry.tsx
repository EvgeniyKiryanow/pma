import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
    AWARD_GROUPS,
    type AwardDef,
    type AwardGroupId,
    CUSTOM_PREFIX,
} from '../../../../shared/awards/catalog';
import { useAwardTypesStore } from '../../../entities/award/model/awardTypesStore';
import AwardTypeEditor from '../../../entities/award/ui/AwardTypeEditor';
import AwardIcon from '../../../entities/user/ui/card/AwardIcon';
import { ApiError } from '../../../shared/api/call';
import { reportError } from '../../../shared/api/errors';
import { Badge, Button, cn, IconButton, SearchInput } from '../../../shared/ui';
import { confirmAction } from '../../../shared/ui/confirm';
import { toast } from '../../../shared/ui/toast';
import { useI18nStore } from '../../../stores/i18nStore';
import { useSearchJump } from '../../../stores/searchJumpStore';
import { usePermissions } from '../../../stores/sessionStore';
import { useUserStore } from '../../../stores/userStore';
import { countAwards, type RegistryFilters, registryGroups } from '../model/registry';
import AwardHoldersModal from './AwardHoldersModal';

/**
 * The register of every award: state, President's, the Ministry's, the Commander-in-Chief's,
 * other bodies', honorary titles, public and the unit's own. Each shows how many people
 * hold it; a click lists them.
 */
export default function AwardsRegistry() {
    const { t } = useI18nStore();
    const users = useUserStore((s) => s.users);
    const types = useAwardTypesStore((s) => s.types);
    const version = useAwardTypesStore((s) => s.version);
    const canManage = usePermissions().can('awards.manage');

    const [filters, setFilters] = useState<RegistryFilters>({
        query: '',
        group: 'all',
        onlyHeld: false,
    });
    const [open, setOpen] = useState<AwardDef | null>(null);
    // The global search opens the register filtered by an award.
    const awardsJump = useSearchJump((s) => s.jumps.awards);
    useEffect(() => {
        if (awardsJump === undefined) return;
        setFilters({ query: awardsJump, group: 'all', onlyHeld: false });
        useSearchJump.getState().clear('awards');
    }, [awardsJump]);
    // undefined: closed; null: a new award; otherwise the award being changed.
    const [editing, setEditing] = useState<string | null | undefined>(undefined);

    const counts = useMemo(() => countAwards(users), [users]);
    const groups = useMemo(
        () => registryGroups(filters, counts),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `version`: own awards changed
        [filters, counts, version],
    );
    const total = groups.reduce((sum, group) => sum + group.awards.length, 0);

    const remove = async (award: AwardDef) => {
        const confirmed = await confirmAction({
            title: t('awards.own.removeTitle'),
            message: t('awards.own.removeMessage', { name: award.name }),
            confirmLabel: t('common.delete'),
            tone: 'danger',
        });
        if (!confirmed) return;
        try {
            await useAwardTypesStore.getState().remove(award.id.slice(CUSTOM_PREFIX.length));
            toast.success(t('awards.own.removed'));
        } catch (err) {
            if (err instanceof ApiError && err.code === 'CONFLICT') {
                toast.warning(t('awards.own.inUse', { count: Number(err.details?.holders ?? 0) }));
            } else {
                reportError(err, { context: 'award-type.remove' });
            }
        }
    };

    const editingType =
        editing === null
            ? null
            : (types.find((type) => `${CUSTOM_PREFIX}${type.uuid}` === editing) ?? null);

    return (
        <div className="space-y-4">
            <div className="card space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <SearchInput
                        className="min-w-60 flex-1"
                        value={filters.query}
                        onChange={(query) => setFilters((f) => ({ ...f, query }))}
                        placeholder={t('awards.registry.search')}
                    />
                    <label className="flex items-center gap-2 text-[13px] text-ink-2">
                        <input
                            type="checkbox"
                            className="size-4"
                            checked={filters.onlyHeld}
                            onChange={(e) =>
                                setFilters((f) => ({ ...f, onlyHeld: e.target.checked }))
                            }
                        />
                        {t('awards.registry.onlyHeld')}
                    </label>
                    {canManage && (
                        <Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>
                            {t('awards.own.add')}
                        </Button>
                    )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {(
                        [
                            'all',
                            ...AWARD_GROUPS.map((g) => g.id).filter((id) => id !== 'other'),
                        ] as (AwardGroupId | 'all')[]
                    ).map((id) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setFilters((f) => ({ ...f, group: id }))}
                            className={cn(
                                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                filters.group === id
                                    ? 'border-primary bg-primary-soft text-primary-ink'
                                    : 'border-line text-ink-3 hover:border-line-strong hover:text-ink',
                            )}
                        >
                            {id === 'all' ? t('awards.report.allGroups') : t(`awards.groups.${id}`)}
                        </button>
                    ))}
                </div>
            </div>

            {total === 0 && !groups.length && (
                <p className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-3">
                    {t('awards.registry.nothing')}
                </p>
            )}

            {groups.map((group) => (
                <section key={group.id} className="space-y-2">
                    <h3 className="eyebrow flex items-center gap-2">
                        {t(`awards.groups.${group.id}`)}
                        <span className="font-mono text-ink-3">{group.awards.length}</span>
                    </h3>
                    {group.id === 'unit' && group.awards.length === 0 && (
                        <div className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-[13px] text-ink-3">
                            {t('awards.own.emptyHint')}
                        </div>
                    )}
                    <ul className="grid grid-cols-1 gap-2 @4xl:grid-cols-2">
                        {group.awards.map((award) => {
                            const count = counts.get(award.id);
                            return (
                                <li
                                    key={award.id}
                                    className={cn(
                                        'group flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5 transition-colors hover:border-primary',
                                        award.retired && 'opacity-75',
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setOpen(award)}
                                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                    >
                                        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-surface-2">
                                            <AwardIcon
                                                awardId={award.id}
                                                degree={award.degrees?.[0]}
                                                size={38}
                                            />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[13px] font-medium leading-snug text-ink">
                                                {award.name}
                                            </span>
                                            <span className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-ink-3">
                                                {award.body && (
                                                    <span className="font-semibold text-ink-2">
                                                        {award.body}
                                                    </span>
                                                )}
                                                {award.custom && award.awardedBy && (
                                                    <span>{award.awardedBy}</span>
                                                )}
                                                {award.degrees && (
                                                    <span className="font-mono">
                                                        {award.degrees.join(' · ')}
                                                    </span>
                                                )}
                                                {award.since && (
                                                    <span>
                                                        {t('awards.since', { year: award.since })}
                                                    </span>
                                                )}
                                                {award.established && (
                                                    <span>{award.established}</span>
                                                )}
                                                {award.retired && (
                                                    <span className="text-warning-ink">
                                                        {t('awards.retired')}
                                                    </span>
                                                )}
                                            </span>
                                        </span>
                                    </button>
                                    {count && (
                                        <span className="flex shrink-0 flex-col items-end gap-1">
                                            {count.granted > 0 && (
                                                <Badge tone="green">
                                                    {t('awards.registry.granted', {
                                                        count: count.granted,
                                                    })}
                                                </Badge>
                                            )}
                                            {count.pending > 0 && (
                                                <Badge tone="amber">
                                                    {t('awards.registry.pending', {
                                                        count: count.pending,
                                                    })}
                                                </Badge>
                                            )}
                                        </span>
                                    )}
                                    {award.custom && canManage && (
                                        <span className="flex shrink-0 gap-0.5">
                                            <IconButton
                                                label={t('common.edit')}
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setEditing(award.id)}
                                                icon={<Pencil className="size-4" />}
                                            />
                                            <IconButton
                                                label={t('common.delete')}
                                                size="sm"
                                                variant="ghost"
                                                className="hover:bg-danger-soft hover:text-danger-ink"
                                                onClick={() => remove(award)}
                                                icon={<Trash2 className="size-4" />}
                                            />
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ))}

            {open && <AwardHoldersModal award={open} onClose={() => setOpen(null)} />}
            {editing !== undefined && (
                <AwardTypeEditor award={editingType} onClose={() => setEditing(undefined)} />
            )}
        </div>
    );
}
