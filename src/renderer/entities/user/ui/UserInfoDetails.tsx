import { Building2, Eye, EyeOff, GraduationCap, IdCard, Medal, ShieldHalf } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { awardTitle, compareAwards, findAward, isGranted } from '../../../../shared/awards/catalog';
import {
    CARD,
    type CardCategoryId,
    type CardField,
    type CardSection,
} from '../../../../shared/personnel/cardSchema';
import type { AwardRecord, User } from '../../../../shared/types/user';
import { cn, EmptyState, Tabs } from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';
import { useUserStore } from '../../../stores/userStore';
import { useShtatniStore } from '../../shtatna-posada/model/useShtatniStore';
import { isFilled, PAY_GRADE_HEADING, staffExtra, VOS_HEADING } from '../model/cardValues';
import AwardIcon from './card/AwardIcon';
import { AwardStatusBadge } from './card/AwardPicker';
import { formatShpkNumber } from './UserCard';
import UserRelatives from './UserRelatives';

type Value = string | boolean | number | undefined | null;

/** Age from a date of birth in `YYYY-MM-DD` or `DD.MM.YYYY` form. */
function ageFrom(dateOfBirth: string | null | undefined): number | null {
    if (!dateOfBirth) return null;
    const dotted = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(dateOfBirth.trim());
    const date = dotted
        ? new Date(Number(dotted[3]), Number(dotted[2]) - 1, Number(dotted[1]))
        : new Date(dateOfBirth);
    if (Number.isNaN(date.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - date.getFullYear();
    if (
        now.getMonth() < date.getMonth() ||
        (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())
    )
        age--;
    return age >= 0 && age < 120 ? age : null;
}

function Fact({ label, value, wide }: { label: string; value: Value | ReactNode; wide?: boolean }) {
    const empty = typeof value !== 'object' || value === null ? !isFilled(value as Value) : false;
    return (
        <div className={cn('min-w-0', wide && 'col-span-full')}>
            <dt className="text-[11px] font-medium uppercase tracking-wider text-ink-3">{label}</dt>
            <dd
                className={cn(
                    'mt-1 whitespace-pre-line break-words text-sm leading-snug',
                    empty ? 'text-ink-3' : 'text-ink',
                )}
            >
                {empty ? '—' : typeof value === 'boolean' ? (value ? 'Так' : 'Ні') : value}
            </dd>
        </div>
    );
}

function InfoCard({
    title,
    icon,
    children,
    aside,
}: {
    title: string;
    icon?: ReactNode;
    children: ReactNode;
    aside?: ReactNode;
}) {
    return (
        <section className="card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-ink">
                {icon && <span className="text-ink-3 [&_svg]:size-4">{icon}</span>}
                <span className="flex-1">{title}</span>
                {aside}
            </h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 @md:grid-cols-2 @3xl:grid-cols-3">
                {children}
            </dl>
        </section>
    );
}

/** Granted awards as small insignia in a row (the header of the card view). */
export function AwardRibbon({ records, max = 8 }: { records?: AwardRecord[]; max?: number }) {
    const { t } = useI18nStore();
    const granted = (records ?? []).filter(isGranted).sort(compareAwards);
    if (!granted.length) return null;
    return (
        <div className="flex flex-wrap items-center gap-1">
            {granted.slice(0, max).map((record) => (
                <span key={record.id} title={awardTitle(record)} className="inline-flex">
                    <AwardIcon awardId={record.awardId} degree={record.degree} size={26} />
                </span>
            ))}
            {granted.length > max && (
                <span className="ml-1 text-xs text-ink-3">
                    {t('awards.more', { count: granted.length - max })}
                </span>
            )}
        </div>
    );
}

function displayValue(user: User, field: CardField, t: (k: string) => string): Value {
    const value = user[field.key] as Value;
    if (field.kind === 'gender' && (value === 'male' || value === 'female')) {
        return t(`card.genders.${value}`);
    }
    if (field.kind === 'checkbox') return Boolean(value) && value !== '0' && value !== 0;
    return value;
}

export default function UserInfoDetails({ user }: { user: User }) {
    const { t } = useI18nStore();
    const [category, setCategory] = useState<CardCategoryId>('personal');
    const [showEmpty, setShowEmpty] = useState(false);
    const positions = useShtatniStore((s) => s.shtatniPosady);

    useEffect(() => {
        if (!useShtatniStore.getState().shtatniPosady.length) {
            void useShtatniStore.getState().fetchAll();
        }
    }, []);

    // Always show the freshest record from the store.
    const { users } = useUserStore();
    const liveUser = useMemo(() => {
        const listed = users.find((u) => u.id === user.id);
        // The list has no history; the selected user has everything, the list is fresher.
        return listed ? { ...user, ...listed } : user;
    }, [users, user]);
    const age = ageFrom(liveUser.dateOfBirth);
    const awards = liveUser.awardRecords ?? [];
    const position = positions.find(
        (p) => String(p.shtat_number) === String(liveUser.shpkNumber ?? ''),
    );

    const sectionCard = (section: CardSection) => {
        const fields = section.fields.filter(
            (f) => f.key !== 'soldierStatus' || category === 'post',
        );
        const shown = fields.filter((f) => showEmpty || isFilled(liveUser[f.key]));
        const extra: ReactNode[] = [];
        if (section.editor === 'relatives' && (liveUser.relatives?.length ?? 0) > 0) {
            extra.push(
                <div key="relatives" className="col-span-full">
                    <UserRelatives relatives={liveUser.relatives ?? []} />
                </div>,
            );
        }
        if (section.editor === 'education' && (liveUser.educationList?.length ?? 0) > 0) {
            extra.push(
                <ul key="education" className="col-span-full space-y-2">
                    {(liveUser.educationList ?? []).map((entry) => (
                        <li
                            key={entry.id}
                            className="flex items-start gap-3 rounded-xl border border-line p-3"
                        >
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-info-soft text-info-ink">
                                <GraduationCap className="size-4" />
                            </span>
                            <div className="min-w-0 text-sm">
                                <p className="font-medium text-ink">
                                    {entry.institution || entry.courses || '—'}
                                </p>
                                <p className="text-xs text-ink-3">
                                    {[
                                        entry.type,
                                        entry.level,
                                        entry.form,
                                        entry.specialty,
                                        entry.courses && entry.institution ? entry.courses : '',
                                        [entry.startYear, entry.endYear].filter(Boolean).join('–'),
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>,
            );
        }
        if (!shown.length && !extra.length) return null;
        return (
            <InfoCard key={section.id} title={t(`card.sections.${section.id}`)}>
                {extra}
                {shown.map((field) => (
                    <Fact
                        key={field.key}
                        label={t(`card.fields.${field.key}`)}
                        value={displayValue(liveUser, field, t)}
                        wide={field.wide || field.kind === 'textarea'}
                    />
                ))}
            </InfoCard>
        );
    };

    const categoryBody = () => {
        if (category === 'awards') {
            const sorted = [...awards].sort(compareAwards);
            return (
                <div className="space-y-3">
                    {sorted.length === 0 && !isFilled(liveUser.awards) && (
                        <div className="card">
                            <EmptyState
                                icon={<Medal />}
                                title={t('awards.empty')}
                                description={t('awards.emptyHint')}
                            />
                        </div>
                    )}
                    {sorted.map((record) => {
                        const award = findAward(record.awardId);
                        const order = [
                            record.orderNumber && `№ ${record.orderNumber}`,
                            record.orderDate && `від ${record.orderDate}`,
                        ]
                            .filter(Boolean)
                            .join(' ');
                        return (
                            <article
                                key={record.id}
                                className={cn(
                                    'card flex items-start gap-4 p-4',
                                    isGranted(record) && 'border-brass/40',
                                )}
                            >
                                <AwardIcon
                                    awardId={record.awardId}
                                    degree={record.degree}
                                    size={48}
                                    muted={!isGranted(record)}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-start gap-2">
                                        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-ink">
                                            {awardTitle(record)}
                                        </p>
                                        <AwardStatusBadge status={record.status} />
                                    </div>
                                    <p className="mt-0.5 text-xs text-ink-3">
                                        {award ? t(`awards.groups.${award.group}`) : ''}
                                        {record.posthumous
                                            ? ` · ${t('awards.fields.posthumous').toLowerCase()}`
                                            : ''}
                                    </p>
                                    <dl className="mt-2 grid grid-cols-1 gap-x-5 gap-y-1 text-[13px] @md:grid-cols-2">
                                        {record.awardedBy && (
                                            <MiniFact
                                                label={t('awards.fields.awardedBy')}
                                                value={record.awardedBy}
                                            />
                                        )}
                                        {order && (
                                            <MiniFact
                                                label={t('awards.fields.orderNumber')}
                                                value={order}
                                            />
                                        )}
                                        {record.submittedAt && (
                                            <MiniFact
                                                label={t('awards.fields.submittedAt')}
                                                value={record.submittedAt}
                                            />
                                        )}
                                        {record.presentedAt && (
                                            <MiniFact
                                                label={t('awards.fields.presentedAt')}
                                                value={record.presentedAt}
                                            />
                                        )}
                                        {record.notes && (
                                            <MiniFact
                                                label={t('awards.fields.notes')}
                                                value={record.notes}
                                            />
                                        )}
                                    </dl>
                                </div>
                            </article>
                        );
                    })}
                    {isFilled(liveUser.awards) && (
                        <InfoCard title={t('card.legacyTitle')}>
                            <Fact label={t('card.fields.awards')} value={liveUser.awards} wide />
                        </InfoCard>
                    )}
                </div>
            );
        }

        const sections = CARD.find((c) => c.id === category)?.sections ?? [];
        const cards = sections.map(sectionCard).filter(Boolean);
        const postCard =
            category === 'post' ? (
                <section className="card p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-ink">
                        <Building2 className="size-4 text-ink-3" />
                        {t('card.sections.staffPost')}
                    </h3>
                    {liveUser.shpkNumber ? (
                        <div className="flex flex-wrap items-start gap-4">
                            <span className="grid h-12 min-w-12 place-items-center rounded-xl bg-primary px-2 font-mono text-base font-semibold text-on-primary">
                                {formatShpkNumber(String(liveUser.shpkNumber)) ??
                                    liveUser.shpkNumber}
                            </span>
                            <dl className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-3 @md:grid-cols-2 @3xl:grid-cols-3">
                                <Fact
                                    label={t('card.fields.position')}
                                    value={position?.position_name || liveUser.position}
                                />
                                <Fact
                                    label={t('card.fields.unitMain')}
                                    value={position?.unit_name || liveUser.unitMain}
                                />
                                <Fact
                                    label={t('card.fields.category')}
                                    value={position?.category || liveUser.category}
                                />
                                <Fact
                                    label={t('card.fields.shpkCode')}
                                    value={position?.shpk_code || liveUser.shpkCode}
                                />
                                <Fact
                                    label={t('card.staff.vosByStaff')}
                                    value={staffExtra(position, VOS_HEADING)}
                                />
                                <Fact
                                    label={t('card.staff.payGrade')}
                                    value={
                                        staffExtra(position, PAY_GRADE_HEADING) || liveUser.tDotData
                                    }
                                />
                            </dl>
                        </div>
                    ) : (
                        <p className="text-sm text-ink-3">{t('card.staff.none')}</p>
                    )}
                </section>
            ) : null;

        return (
            <div className="space-y-4">
                {postCard}
                {cards}
                {!cards.length && !postCard && (
                    <div className="card">
                        <EmptyState
                            icon={<IdCard />}
                            title={t('card.nothingHere')}
                            description={t(`card.categoryHints.${category}`)}
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="@container space-y-4">
            <InfoCard
                title="Службові дані"
                icon={<ShieldHalf />}
                aside={<AwardRibbon records={awards} max={6} />}
            >
                <Fact label={t('card.fields.rank')} value={liveUser.rank} />
                <Fact label={t('card.fields.position')} value={liveUser.position} />
                <Fact label={t('card.fields.unitMain')} value={liveUser.unitMain} />
                <Fact
                    label={t('card.fields.dateOfBirth')}
                    value={
                        isFilled(liveUser.dateOfBirth)
                            ? `${liveUser.dateOfBirth}${age !== null ? ` · ${age} р.` : ''}`
                            : null
                    }
                />
                <Fact label={t('card.fields.shpkCode')} value={liveUser.shpkCode} />
                <Fact
                    label={t('card.fields.shpkNumber')}
                    value={formatShpkNumber(liveUser.shpkNumber)}
                />
            </InfoCard>

            <div className="flex flex-wrap items-center justify-between gap-2">
                <Tabs
                    value={category}
                    onChange={setCategory}
                    variant="pills"
                    items={CARD.map((c) => ({
                        value: c.id,
                        label: t(`card.categories.${c.id}`),
                        icon:
                            c.id === 'personal' ? (
                                <IdCard />
                            ) : c.id === 'awards' ? (
                                <Medal />
                            ) : (
                                <Building2 />
                            ),
                        count: c.id === 'awards' && awards.length ? awards.length : undefined,
                    }))}
                />
                {category !== 'awards' && (
                    <button
                        type="button"
                        onClick={() => setShowEmpty((v) => !v)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                        {showEmpty ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        {showEmpty ? t('card.hideEmpty') : t('card.showEmpty')}
                    </button>
                )}
            </div>

            <div key={category} className="animate-fade-in">
                {categoryBody()}
            </div>
        </div>
    );
}

function MiniFact({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <dt className="inline text-ink-3">{label}: </dt>
            <dd className="inline text-ink">{value}</dd>
        </div>
    );
}
