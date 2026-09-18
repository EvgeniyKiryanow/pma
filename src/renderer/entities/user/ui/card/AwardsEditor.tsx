import { Medal, Plus, Replace, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';

import {
    AWARD_STATUSES,
    type AwardDef,
    AWARDED_BY_SUGGESTIONS,
    awardTitle,
    defaultAwardedBy,
    findAward,
    isGranted,
    newAwardRecord,
} from '../../../../../shared/awards/catalog';
import type { AwardRecord, AwardStatus } from '../../../../../shared/types/user';
import { Button, cn, IconButton } from '../../../../shared/ui';
import { useI18nStore } from '../../../../stores/i18nStore';
import AwardIcon from './AwardIcon';
import AwardPicker, { AwardStatusBadge } from './AwardPicker';
import { DateInput } from './fields';

/** The awards of a person: add from the catalogue, then track from submission to presentation. */
export default function AwardsEditor({
    records,
    onChange,
}: {
    records: AwardRecord[];
    onChange: (records: AwardRecord[]) => void;
}) {
    const { t } = useI18nStore();
    // null: closed; 'new': adding; an id: replacing the award of that record.
    const [picking, setPicking] = useState<string | null>(null);

    const update = (id: string, patch: Partial<AwardRecord>) =>
        onChange(records.map((record) => (record.id === id ? { ...record, ...patch } : record)));

    const pick = (award: AwardDef) => {
        if (picking === 'new') {
            onChange([newAwardRecord(award), ...records]);
        } else if (picking) {
            const current = records.find((record) => record.id === picking);
            update(picking, {
                awardId: award.id,
                degree: award.degrees ? award.degrees[award.degrees.length - 1] : undefined,
                title: award.id === 'other' ? current?.title : undefined,
                awardedBy:
                    current?.awardedBy && current.awardedBy !== defaultAwardedBy(current.awardId)
                        ? current.awardedBy
                        : defaultAwardedBy(award.id),
            });
        }
        setPicking(null);
    };

    const granted = records.filter(isGranted).length;
    const pending = records.filter((r) => r.status === 'draft' || r.status === 'submitted').length;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <Button icon={<Plus className="size-4" />} onClick={() => setPicking('new')}>
                    {t('awards.add')}
                </Button>
                {records.length > 0 && (
                    <p className="text-[13px] text-ink-3">
                        {t('awards.granted')}:{' '}
                        <span className="font-semibold text-ink">{granted}</span>
                        <span className="mx-2">·</span>
                        {t('awards.inProgress')}:{' '}
                        <span className="font-semibold text-ink">{pending}</span>
                    </p>
                )}
            </div>

            {records.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center">
                    <span className="grid size-12 place-items-center rounded-2xl bg-brass-soft text-brass-ink">
                        <Medal className="size-6" />
                    </span>
                    <p className="text-sm font-semibold text-ink">{t('awards.empty')}</p>
                    <p className="max-w-md text-[13px] text-ink-3">{t('awards.emptyHint')}</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {records.map((record) => (
                        <AwardRecordCard
                            key={record.id}
                            record={record}
                            onChange={(patch) => update(record.id, patch)}
                            onReplace={() => setPicking(record.id)}
                            onRemove={() => onChange(records.filter((r) => r.id !== record.id))}
                        />
                    ))}
                </ul>
            )}

            {picking && <AwardPicker onPick={pick} onClose={() => setPicking(null)} />}
        </div>
    );
}

function AwardRecordCard({
    record,
    onChange,
    onReplace,
    onRemove,
}: {
    record: AwardRecord;
    onChange: (patch: Partial<AwardRecord>) => void;
    onReplace: () => void;
    onRemove: () => void;
}) {
    const { t } = useI18nStore();
    const id = useId();
    const award = findAward(record.awardId);
    const isOther = !award || award.id === 'other';
    const field = (name: string) => `${id}-${name}`;

    return (
        <li
            className={cn(
                'overflow-hidden rounded-2xl border bg-surface',
                isGranted(record) ? 'border-brass/40' : 'border-line',
            )}
        >
            <div
                className={cn(
                    'flex items-center gap-3 border-b px-4 py-3',
                    isGranted(record)
                        ? 'border-brass/30 bg-brass-soft/60'
                        : 'border-line bg-surface-2',
                )}
            >
                <AwardIcon
                    awardId={record.awardId}
                    degree={record.degree}
                    size={44}
                    muted={record.status === 'rejected'}
                />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-ink">
                        {awardTitle(record)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-3">
                        {award ? t(`awards.groups.${award.group}`) : t('awards.groups.other')}
                        {record.posthumous
                            ? ` · ${t('awards.fields.posthumous').toLowerCase()}`
                            : ''}
                    </p>
                </div>
                <AwardStatusBadge status={record.status} />
                <IconButton
                    label={t('awards.change')}
                    size="sm"
                    variant="ghost"
                    onClick={onReplace}
                    icon={<Replace className="size-4" />}
                />
                <IconButton
                    label={t('awards.remove')}
                    size="sm"
                    variant="ghost"
                    className="hover:bg-danger-soft hover:text-danger-ink"
                    onClick={onRemove}
                    icon={<Trash2 className="size-4" />}
                />
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 @xl:grid-cols-2 @3xl:grid-cols-4">
                {isOther && (
                    <div className="col-span-full">
                        <label htmlFor={field('title')} className="label">
                            {t('awards.fields.title')}
                        </label>
                        <input
                            id={field('title')}
                            className="field"
                            value={record.title ?? ''}
                            placeholder={t('awards.otherHint')}
                            onChange={(e) => onChange({ title: e.target.value })}
                        />
                    </div>
                )}
                {award?.degrees && (
                    <div>
                        <label htmlFor={field('degree')} className="label">
                            {t('awards.fields.degree')}
                        </label>
                        <select
                            id={field('degree')}
                            className="field"
                            value={record.degree ?? ''}
                            onChange={(e) => onChange({ degree: e.target.value || undefined })}
                        >
                            {award.degrees.map((degree) => (
                                <option key={degree} value={degree}>
                                    {t('awards.degreeOf', { degree })}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <div className={cn(award?.degrees ? '' : '@3xl:col-span-2')}>
                    <label htmlFor={field('by')} className="label">
                        {t('awards.fields.awardedBy')}
                    </label>
                    <input
                        id={field('by')}
                        className="field"
                        list={field('by-list')}
                        value={record.awardedBy ?? ''}
                        onChange={(e) => onChange({ awardedBy: e.target.value })}
                    />
                    <datalist id={field('by-list')}>
                        {AWARDED_BY_SUGGESTIONS.map((option) => (
                            <option key={option} value={option} />
                        ))}
                    </datalist>
                </div>
                <div>
                    <label htmlFor={field('status')} className="label">
                        {t('awards.fields.status')}
                    </label>
                    <select
                        id={field('status')}
                        className="field"
                        value={record.status}
                        onChange={(e) => onChange({ status: e.target.value as AwardStatus })}
                    >
                        {AWARD_STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {t(`awards.statuses.${status}`)}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor={field('submitted')} className="label">
                        {t('awards.fields.submittedAt')}
                    </label>
                    <DateInput
                        id={field('submitted')}
                        value={record.submittedAt ?? ''}
                        onChange={(submittedAt) => onChange({ submittedAt })}
                    />
                </div>
                <div>
                    <label htmlFor={field('order-date')} className="label">
                        {t('awards.fields.orderDate')}
                    </label>
                    <DateInput
                        id={field('order-date')}
                        value={record.orderDate ?? ''}
                        onChange={(orderDate) => onChange({ orderDate })}
                    />
                </div>
                <div>
                    <label htmlFor={field('order-number')} className="label">
                        {t('awards.fields.orderNumber')}
                    </label>
                    <input
                        id={field('order-number')}
                        className="field"
                        value={record.orderNumber ?? ''}
                        onChange={(e) => onChange({ orderNumber: e.target.value })}
                    />
                </div>
                <div>
                    <label htmlFor={field('presented')} className="label">
                        {t('awards.fields.presentedAt')}
                    </label>
                    <DateInput
                        id={field('presented')}
                        value={record.presentedAt ?? ''}
                        onChange={(presentedAt) => onChange({ presentedAt })}
                    />
                </div>
                <div className="@3xl:col-span-3">
                    <label htmlFor={field('notes')} className="label">
                        {t('awards.fields.notes')}
                    </label>
                    <input
                        id={field('notes')}
                        className="field"
                        value={record.notes ?? ''}
                        onChange={(e) => onChange({ notes: e.target.value })}
                    />
                </div>
                <label className="flex items-center gap-2.5 self-end rounded-lg border border-line px-3 py-2.5 text-sm text-ink">
                    <input
                        type="checkbox"
                        className="size-4"
                        checked={Boolean(record.posthumous)}
                        onChange={(e) => onChange({ posthumous: e.target.checked || undefined })}
                    />
                    {t('awards.fields.posthumous')}
                </label>
            </div>
        </li>
    );
}
