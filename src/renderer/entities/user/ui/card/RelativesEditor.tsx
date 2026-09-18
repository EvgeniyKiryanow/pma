import { Plus, Trash2 } from 'lucide-react';

import type { RelativeContact } from '../../../../../shared/types/user';
import { Button, IconButton } from '../../../../shared/ui';
import { useI18nStore } from '../../../../stores/i18nStore';

/** Relatives with a phone: the family of the card (Impulse «Склад сімʼї» is built from them). */
export default function RelativesEditor({
    relatives,
    onChange,
}: {
    relatives: RelativeContact[];
    onChange: (relatives: RelativeContact[]) => void;
}) {
    const { t } = useI18nStore();
    const update = (index: number, field: keyof RelativeContact, value: string) =>
        onChange(relatives.map((rel, i) => (i === index ? { ...rel, [field]: value } : rel)));

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-medium text-ink-2">{t('user.relatives')}</p>
                <Button
                    variant="soft"
                    size="xs"
                    icon={<Plus className="size-3.5" />}
                    onClick={() => onChange([...relatives, { name: '', relationship: '' }])}
                >
                    {t('user.addRelative')}
                </Button>
            </div>
            {relatives.length > 0 && (
                <ul className="space-y-2">
                    {relatives.map((rel, idx) => (
                        <li
                            key={idx}
                            className="grid grid-cols-1 items-center gap-2 rounded-xl border border-line p-2.5 @xl:grid-cols-[1fr_1fr_1fr_auto]"
                        >
                            <input
                                className="field field-sm"
                                placeholder={t('user.relativeName')}
                                value={rel.name || ''}
                                onChange={(e) => update(idx, 'name', e.target.value)}
                            />
                            <input
                                className="field field-sm"
                                placeholder={t('user.relativeRelation')}
                                value={rel.relationship || ''}
                                onChange={(e) => update(idx, 'relationship', e.target.value)}
                            />
                            <input
                                className="field field-sm"
                                placeholder={t('user.relativePhone')}
                                value={rel.phone || ''}
                                onChange={(e) => update(idx, 'phone', e.target.value)}
                            />
                            <IconButton
                                label={t('common.delete')}
                                size="sm"
                                className="hover:bg-danger-soft hover:text-danger-ink"
                                onClick={() => onChange(relatives.filter((_, i) => i !== idx))}
                                icon={<Trash2 className="size-4" />}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
