import { Medal } from 'lucide-react';
import { useId, useState } from 'react';

import { AWARD_KINDS, type AwardKind, customAwardDef } from '../../../../shared/awards/catalog';
import type { AwardType, AwardTypeInput } from '../../../../shared/types/awards';
import { errorMessage } from '../../../shared/api/call';
import { useAsyncAction } from '../../../shared/hooks/useAsyncAction';
import { Alert, Button, cn, Modal } from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';
import AwardIcon from '../../user/ui/card/AwardIcon';
import { useAwardTypesStore } from '../model/awardTypesStore';

const DEGREES = ['I', 'II', 'III', 'IV', 'V'] as const;
/** Kinds that make sense for an own award ('hero' and 'title' are the state's). */
const OWN_KINDS = AWARD_KINDS.filter((kind) => kind !== 'hero' && kind !== 'title');

const EMPTY: AwardTypeInput = {
    name: '',
    kind: 'medal',
    awardedBy: 'Командир військової частини',
    degrees: [],
    established: '',
    notes: '',
    retired: false,
};

/** Adds or changes an award of the unit's own register (brigade, battalion, local...). */
export default function AwardTypeEditor({
    award,
    onClose,
    onSaved,
}: {
    /** Null: a new award. */
    award: AwardType | null;
    onClose: () => void;
    onSaved?: (award: AwardType) => void;
}) {
    const { t } = useI18nStore();
    const id = useId();
    const [form, setForm] = useState<AwardTypeInput>(award ? { ...award } : { ...EMPTY });
    const set = (patch: Partial<AwardTypeInput>) =>
        setForm((current) => ({ ...current, ...patch }));
    const save = useAsyncAction(
        (input: AwardTypeInput) => useAwardTypesStore.getState().save(input),
        {
            success: t('awards.own.saved'),
            error: false,
            onSuccess: (saved) => {
                onSaved?.(saved);
                onClose();
            },
            context: 'award-type',
        },
    );

    const preview = customAwardDef({ ...form, uuid: 'preview' } as AwardType);
    const field = (name: string) => `${id}-${name}`;
    // From the latest state: two quick clicks must both count.
    const toggleDegree = (degree: string) =>
        setForm((current) => ({
            ...current,
            degrees: current.degrees.includes(degree)
                ? current.degrees.filter((d) => d !== degree)
                : DEGREES.filter((d) => d === degree || current.degrees.includes(d)),
        }));

    return (
        <Modal
            open
            onClose={onClose}
            title={award ? t('awards.own.editTitle') : t('awards.own.addTitle')}
            description={t('awards.own.description')}
            icon={<Medal />}
            width="max-w-2xl"
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        loading={save.pending}
                        disabled={!form.name.trim()}
                        onClick={() => void save.run(form)}
                    >
                        {t('common.save')}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                {save.error && <Alert tone="error">{errorMessage(save.error, t)}</Alert>}
                <div className="flex items-start gap-4">
                    <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-surface-2">
                        <AwardIcon
                            awardId={preview.id}
                            kind={preview.kind}
                            group="unit"
                            degree={form.degrees[form.degrees.length - 1]}
                            size={52}
                        />
                    </span>
                    <div className="min-w-0 flex-1">
                        <label htmlFor={field('name')} className="label">
                            {t('awards.own.name')}
                        </label>
                        <input
                            id={field('name')}
                            className="field"
                            autoFocus
                            value={form.name}
                            placeholder={t('awards.own.namePlaceholder')}
                            onChange={(e) => set({ name: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <p className="label">{t('awards.own.kind')}</p>
                    <div className="flex flex-wrap gap-1.5">
                        {OWN_KINDS.map((kind) => (
                            <button
                                key={kind}
                                type="button"
                                onClick={() => set({ kind: kind as AwardKind })}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                    form.kind === kind
                                        ? 'border-primary bg-primary-soft text-primary-ink'
                                        : 'border-line text-ink-3 hover:border-line-strong hover:text-ink',
                                )}
                            >
                                {t(`awards.kinds.${kind}`)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label htmlFor={field('by')} className="label">
                            {t('awards.fields.awardedBy')}
                        </label>
                        <input
                            id={field('by')}
                            className="field"
                            value={form.awardedBy}
                            onChange={(e) => set({ awardedBy: e.target.value })}
                        />
                    </div>
                    <div>
                        <label htmlFor={field('established')} className="label">
                            {t('awards.own.established')}
                        </label>
                        <input
                            id={field('established')}
                            className="field"
                            value={form.established}
                            placeholder={t('awards.own.establishedPlaceholder')}
                            onChange={(e) => set({ established: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <p className="label">{t('awards.own.degrees')}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {DEGREES.map((degree) => (
                            <button
                                key={degree}
                                type="button"
                                aria-pressed={form.degrees.includes(degree)}
                                onClick={() => toggleDegree(degree)}
                                className={cn(
                                    'min-w-10 rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold transition-colors',
                                    form.degrees.includes(degree)
                                        ? 'border-primary bg-primary-soft text-primary-ink'
                                        : 'border-line text-ink-3 hover:border-line-strong',
                                )}
                            >
                                {degree}
                            </button>
                        ))}
                        <span className="ml-1 text-xs text-ink-3">
                            {t('awards.own.degreesHint')}
                        </span>
                    </div>
                </div>

                <div>
                    <label htmlFor={field('notes')} className="label">
                        {t('awards.own.notes')}
                    </label>
                    <textarea
                        id={field('notes')}
                        className="field min-h-20"
                        value={form.notes}
                        placeholder={t('awards.own.notesPlaceholder')}
                        onChange={(e) => set({ notes: e.target.value })}
                    />
                </div>

                {award && (
                    <label className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2.5 text-sm text-ink">
                        <input
                            type="checkbox"
                            className="size-4"
                            checked={form.retired}
                            onChange={(e) => set({ retired: e.target.checked })}
                        />
                        {t('awards.own.retired')}
                    </label>
                )}
            </div>
        </Modal>
    );
}
