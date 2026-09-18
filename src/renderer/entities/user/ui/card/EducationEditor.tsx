import { GraduationCap, Plus, Trash2 } from 'lucide-react';
import { useId } from 'react';

import {
    IMPULSE_CIVIL_EDUCATION_LEVELS,
    IMPULSE_EDUCATION_TYPES,
    IMPULSE_INSTITUTION_TYPES,
    IMPULSE_MILITARY_COURSES,
    IMPULSE_MILITARY_EDUCATION_LEVELS,
    IMPULSE_STUDY_FORMS,
} from '../../../../../shared/personnel/impulseDictionaries';
import type { EducationEntry } from '../../../../../shared/types/user';
import { Button, IconButton } from '../../../../shared/ui';
import { useI18nStore } from '../../../../stores/i18nStore';
import { DictionarySelect } from './fields';

/** Lines of Impulse «Освіта і курси»: schools, universities, military courses. */
export default function EducationEditor({
    entries,
    onChange,
}: {
    entries: EducationEntry[];
    onChange: (entries: EducationEntry[]) => void;
}) {
    const { t } = useI18nStore();
    const update = (id: string, patch: Partial<EducationEntry>) =>
        onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));

    return (
        <div className="space-y-3">
            {entries.length === 0 && (
                <p className="rounded-xl border border-dashed border-line-strong px-4 py-4 text-center text-sm text-ink-3">
                    {t('card.education.empty')}
                </p>
            )}
            {entries.map((entry) => (
                <EducationRow
                    key={entry.id}
                    entry={entry}
                    onChange={(patch) => update(entry.id, patch)}
                    onRemove={() => onChange(entries.filter((e) => e.id !== entry.id))}
                />
            ))}
            <Button
                variant="soft"
                size="sm"
                icon={<Plus className="size-3.5" />}
                onClick={() =>
                    onChange([...entries, { id: crypto.randomUUID(), type: 'Цивільна' }])
                }
            >
                {t('card.education.add')}
            </Button>
        </div>
    );
}

function EducationRow({
    entry,
    onChange,
    onRemove,
}: {
    entry: EducationEntry;
    onChange: (patch: Partial<EducationEntry>) => void;
    onRemove: () => void;
}) {
    const { t } = useI18nStore();
    const id = useId();
    const military = entry.type === 'Військова';
    const text = (name: keyof EducationEntry, wide = false) => (
        <div className={wide ? '@xl:col-span-2' : undefined}>
            <label htmlFor={`${id}-${name}`} className="label">
                {t(`card.education.${name}`)}
            </label>
            <input
                id={`${id}-${name}`}
                className="field"
                value={String(entry[name] ?? '')}
                onChange={(e) => onChange({ [name]: e.target.value })}
            />
        </div>
    );
    const select = (name: keyof EducationEntry, options: readonly string[]) => (
        <div>
            <label htmlFor={`${id}-${name}`} className="label">
                {t(`card.education.${name}`)}
            </label>
            <DictionarySelect
                id={`${id}-${name}`}
                value={String(entry[name] ?? '')}
                options={options}
                onChange={(value) => onChange({ [name]: value })}
            />
        </div>
    );

    return (
        <div className="rounded-xl border border-line bg-surface p-3">
            <div className="mb-3 flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-info-soft text-info-ink">
                    <GraduationCap className="size-4" />
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                    {entry.institution || entry.courses || entry.type || '—'}
                    {entry.endYear ? ` · ${entry.endYear}` : ''}
                </p>
                <IconButton
                    label={t('card.education.remove')}
                    size="sm"
                    variant="ghost"
                    className="hover:bg-danger-soft hover:text-danger-ink"
                    onClick={onRemove}
                    icon={<Trash2 className="size-4" />}
                />
            </div>
            <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2 @3xl:grid-cols-4">
                {select('type', IMPULSE_EDUCATION_TYPES)}
                {select(
                    'level',
                    military ? IMPULSE_MILITARY_EDUCATION_LEVELS : IMPULSE_CIVIL_EDUCATION_LEVELS,
                )}
                {select('form', IMPULSE_STUDY_FORMS)}
                {military ? select('courses', IMPULSE_MILITARY_COURSES) : text('specialty')}
                {text('institution', true)}
                {select('institutionType', IMPULSE_INSTITUTION_TYPES)}
                {military && text('specialty')}
                {text('startYear')}
                {text('endYear')}
                {text('comment', true)}
            </div>
        </div>
    );
}
