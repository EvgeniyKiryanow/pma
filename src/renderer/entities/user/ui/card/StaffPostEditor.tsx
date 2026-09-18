import { Building2, ChevronDown, UserMinus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { staffCategoryName } from '../../../../../shared/personnel/staffCategory';
import type { User } from '../../../../../shared/types/user';
import { Button, cn, SearchInput } from '../../../../shared/ui';
import { useI18nStore } from '../../../../stores/i18nStore';
import type { ShtatnaPosada } from '../../../shtatna-posada/model/useShtatniStore';
import { PAY_GRADE_HEADING, staffExtra, VOS_HEADING } from '../../model/cardValues';
import { formatShpkNumber } from '../UserCard';

type PostFields = Pick<User, 'shpkNumber' | 'unitMain' | 'position' | 'category' | 'shpkCode'>;

/** The staff position (from the БЧС) of the card: shown from the table, chosen from it. */
export default function StaffPostEditor({
    userId,
    form,
    onChange,
    positions,
    users,
}: {
    userId?: number;
    form: Partial<User>;
    onChange: (patch: Partial<PostFields>) => void;
    positions: ShtatnaPosada[];
    users: User[];
}) {
    const { t } = useI18nStore();
    const [picking, setPicking] = useState(false);
    const [query, setQuery] = useState('');
    const number = String(form.shpkNumber ?? '').trim();
    const special = number === 'excluded' || number.includes('order');
    const position = positions.find((p) => String(p.shtat_number) === number);

    const holders = useMemo(() => {
        const map = new Map<string, User>();
        for (const user of users) {
            if (user.id !== userId && user.shpkNumber) map.set(String(user.shpkNumber), user);
        }
        return map;
    }, [users, userId]);

    const found = useMemo(() => {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        return positions
            .filter((p) =>
                words.every((word) =>
                    [
                        p.shtat_number,
                        p.position_name,
                        p.unit_name,
                        p.shpk_code,
                        holders.get(String(p.shtat_number))?.fullName,
                    ]
                        .join(' ')
                        .toLowerCase()
                        .includes(word),
                ),
            )
            .slice(0, 200);
    }, [positions, query, holders]);

    const choose = (p: ShtatnaPosada) => {
        onChange({
            shpkNumber: p.shtat_number,
            position: p.position_name ?? '',
            unitMain: p.unit_name ?? '',
            category: p.category ?? '',
            shpkCode: p.shpk_code ?? '',
        });
        setPicking(false);
        setQuery('');
    };

    const manual = (key: keyof PostFields) => (
        <div key={key}>
            <label htmlFor={`post-${key}`} className="label">
                {t(`card.fields.${key}`)}
            </label>
            <input
                id={`post-${key}`}
                className="field"
                value={String(form[key] ?? '')}
                onChange={(e) => onChange({ [key]: e.target.value })}
            />
        </div>
    );

    if (special) {
        return (
            <div className="rounded-2xl border border-warning-line bg-warning-soft px-4 py-3 text-sm text-warning-ink">
                {formatShpkNumber(number)}
                {form.position ? ` · ${form.position}` : ''}
            </div>
        );
    }

    if (positions.length === 0) {
        return (
            <div className="space-y-3">
                <p className="text-[13px] text-ink-3">{t('card.staff.noStaffing')}</p>
                <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @3xl:grid-cols-3">
                    {manual('shpkNumber')}
                    {manual('position')}
                    {manual('unitMain')}
                    {manual('category')}
                    {manual('shpkCode')}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {position ? (
                <div className="flex flex-wrap items-start gap-4 rounded-2xl border border-primary/30 bg-primary-soft/60 p-4">
                    <span className="grid h-14 min-w-14 place-items-center rounded-xl bg-primary px-2 font-mono text-lg font-semibold text-on-primary shadow-card">
                        {position.shtat_number}
                    </span>
                    <div className="min-w-55 flex-1">
                        <p className="text-[15px] font-semibold leading-snug text-ink">
                            {position.position_name || '—'}
                        </p>
                        <p className="mt-0.5 text-sm text-ink-2">{position.unit_name || '—'}</p>
                        <dl className="mt-2.5 flex flex-wrap gap-2 text-xs">
                            <Chip
                                label={t('card.fields.category')}
                                value={staffCategoryName(position.category)}
                            />
                            <Chip label={t('card.fields.shpkCode')} value={position.shpk_code} />
                            <Chip
                                label={t('card.staff.vosByStaff')}
                                value={staffExtra(position, VOS_HEADING)}
                            />
                            <Chip
                                label={t('card.staff.payGrade')}
                                value={staffExtra(position, PAY_GRADE_HEADING)}
                            />
                        </dl>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={<ChevronDown className="size-3.5" />}
                            onClick={() => setPicking((open) => !open)}
                        >
                            {t('card.staff.change')}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={<UserMinus className="size-3.5" />}
                            onClick={() =>
                                onChange({
                                    shpkNumber: '',
                                    position: '',
                                    unitMain: '',
                                    category: '',
                                    shpkCode: '',
                                })
                            }
                        >
                            {t('card.staff.release')}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-3">
                    <Building2 className="size-5 text-ink-3" />
                    <p className="min-w-50 flex-1 text-sm text-ink-2">
                        {number ? t('card.staff.notInStaffing', { number }) : t('card.staff.none')}
                    </p>
                    <Button size="sm" onClick={() => setPicking((open) => !open)}>
                        {t('card.staff.choose')}
                    </Button>
                </div>
            )}

            {number && !position && (
                <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @3xl:grid-cols-3">
                    {manual('position')}
                    {manual('unitMain')}
                    {manual('category')}
                    {manual('shpkCode')}
                </div>
            )}

            {picking && (
                <div className="animate-fade-in space-y-2 rounded-2xl border border-line bg-surface-2 p-3">
                    <SearchInput
                        value={query}
                        onChange={setQuery}
                        placeholder={t('card.staff.search')}
                        autoFocus
                    />
                    <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
                        {found.length === 0 && (
                            <li className="px-2 py-3 text-center text-sm text-ink-3">
                                {t('card.staff.noResults')}
                            </li>
                        )}
                        {found.map((p) => {
                            const holder = holders.get(String(p.shtat_number));
                            const current = String(p.shtat_number) === number;
                            return (
                                <li key={p.shtat_number}>
                                    <button
                                        type="button"
                                        onClick={() => choose(p)}
                                        className={cn(
                                            'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface',
                                            current && 'bg-primary-soft',
                                        )}
                                    >
                                        <span className="w-12 shrink-0 font-mono text-[13px] font-semibold text-ink">
                                            {p.shtat_number}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[13px] font-medium text-ink">
                                                {p.position_name || '—'}
                                            </span>
                                            <span className="block truncate text-xs text-ink-3">
                                                {[p.unit_name, p.category, p.shpk_code]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </span>
                                        </span>
                                        <span
                                            className={cn(
                                                'shrink-0 text-xs',
                                                holder ? 'text-ink-2' : 'text-success-ink',
                                            )}
                                        >
                                            {current
                                                ? t('card.staff.current')
                                                : holder
                                                  ? t('card.staff.occupiedBy', {
                                                        name: holder.fullName,
                                                    })
                                                  : t('card.staff.vacant')}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}

function Chip({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1">
            <dt className="text-ink-3">{label}</dt>
            <dd className="font-medium text-ink">{value}</dd>
        </div>
    );
}
