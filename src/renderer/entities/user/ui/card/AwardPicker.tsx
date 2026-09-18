import { Medal } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
    AWARD_GROUPS,
    type AwardDef,
    type AwardGroupId,
    AWARDS,
} from '../../../../../shared/awards/catalog';
import type { AwardStatus } from '../../../../../shared/types/user';
import { Badge, type BadgeTone, cn, Modal, SearchInput } from '../../../../shared/ui';
import { useI18nStore } from '../../../../stores/i18nStore';
import AwardIcon from './AwardIcon';

const STATUS_TONES: Record<AwardStatus, BadgeTone> = {
    draft: 'gray',
    submitted: 'amber',
    awarded: 'green',
    presented: 'olive',
    rejected: 'red',
};

export function AwardStatusBadge({ status }: { status: AwardStatus }) {
    const { t } = useI18nStore();
    return <Badge tone={STATUS_TONES[status] ?? 'gray'}>{t(`awards.statuses.${status}`)}</Badge>;
}

const normalize = (text: string) =>
    text
        .toLowerCase()
        .replace(/[«»"'’ʼ]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

/** The catalogue of awards, grouped by who awards them; returns the chosen award. */
export default function AwardPicker({
    onPick,
    onClose,
}: {
    onPick: (award: AwardDef) => void;
    onClose: () => void;
}) {
    const { t } = useI18nStore();
    const [query, setQuery] = useState('');
    const [group, setGroup] = useState<AwardGroupId | 'all'>('all');

    const groups = useMemo(() => {
        const words = normalize(query).split(' ').filter(Boolean);
        // «Інша нагорода» stays at the end whatever is typed: it is the answer when the
        // catalogue has nothing.
        return AWARD_GROUPS.map((g) => ({
            id: g.id,
            awards: AWARDS.filter(
                (award) =>
                    award.group === g.id &&
                    (group === 'all' || group === g.id || award.group === 'other') &&
                    (award.group === 'other' ||
                        words.every((word) => normalize(award.name).includes(word))),
            ),
        })).filter((g) => g.awards.length > 0);
    }, [query, group]);

    const total = groups
        .filter((g) => g.id !== 'other')
        .reduce((sum, g) => sum + g.awards.length, 0);

    return (
        <Modal
            open
            onClose={onClose}
            title={t('awards.pickTitle')}
            description={t('awards.pickDescription')}
            icon={<Medal />}
            width="max-w-4xl"
            bodyClassName="p-0 flex min-h-0 flex-col"
        >
            <div className="space-y-3 border-b border-line px-5 py-3">
                <SearchInput
                    value={query}
                    onChange={setQuery}
                    placeholder={t('awards.search')}
                    autoFocus
                />
                <div className="flex flex-wrap gap-1.5">
                    {(['all', ...AWARD_GROUPS.map((g) => g.id)] as const).map((id) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setGroup(id)}
                            className={cn(
                                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                group === id
                                    ? 'border-primary bg-primary-soft text-primary-ink'
                                    : 'border-line text-ink-3 hover:border-line-strong hover:text-ink',
                            )}
                        >
                            {id === 'all' ? t('awards.report.allGroups') : t(`awards.groups.${id}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {total === 0 && (
                    <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-3">
                        {t('awards.noResults')}
                    </p>
                )}
                <div className="space-y-6">
                    {groups.map((g) => (
                        <section key={g.id}>
                            <h4 className="eyebrow mb-2.5">{t(`awards.groups.${g.id}`)}</h4>
                            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {g.awards.map((award) => (
                                    <li key={award.id}>
                                        <button
                                            type="button"
                                            onClick={() => onPick(award)}
                                            className={cn(
                                                'group flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-2.5 text-left transition-all hover:-translate-y-px hover:border-primary hover:shadow-card',
                                                award.retired && 'opacity-75',
                                            )}
                                        >
                                            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-surface-2 transition-colors group-hover:bg-primary-soft">
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
                                                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-3">
                                                    {award.degrees && (
                                                        <span className="font-mono">
                                                            {award.degrees.join(' · ')}
                                                        </span>
                                                    )}
                                                    {award.since && (
                                                        <span>
                                                            {t('awards.since', {
                                                                year: award.since,
                                                            })}
                                                        </span>
                                                    )}
                                                    {award.retired && (
                                                        <span className="text-warning-ink">
                                                            {t('awards.retired')}
                                                        </span>
                                                    )}
                                                    {award.id === 'other' && (
                                                        <span>{t('awards.otherHint')}</span>
                                                    )}
                                                </span>
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </div>
        </Modal>
    );
}
