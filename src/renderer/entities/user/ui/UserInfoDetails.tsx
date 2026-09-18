import { ChevronDown, IdCard, ShieldHalf } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

import type { User } from '../../../../shared/types/user';
import { cn } from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';
import { useUserStore } from '../../../stores/userStore';
import { formatShpkNumber } from './UserCard';
import UserRelatives from './UserRelatives';

type Props = {
    user: User;
};

type Value = string | boolean | number | undefined | null;

function isEmpty(value: Value): boolean {
    return value === undefined || value === null || String(value).trim() === '';
}

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
    const empty = typeof value !== 'object' || value === null ? isEmpty(value as Value) : false;
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
}: {
    title: string;
    icon?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-ink">
                {icon && <span className="text-ink-3 [&_svg]:size-4">{icon}</span>}
                {title}
            </h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 @md:grid-cols-2 @3xl:grid-cols-3">
                {children}
            </dl>
        </section>
    );
}

export default function UserInfoDetails({ user }: Props) {
    const { t } = useI18nStore();
    const [showFullInfo, setShowFullInfo] = useState(false);

    // Always show the freshest record from the store.
    const { users } = useUserStore();
    const liveUser = useMemo(() => users.find((u) => u.id === user.id) || user, [users, user]);
    const age = ageFrom(liveUser.dateOfBirth);

    return (
        <div className="@container space-y-4">
            <InfoCard title="Службові дані" icon={<ShieldHalf />}>
                <Fact label={t('user.rank')} value={liveUser.rank} />
                <Fact label={t('user.position')} value={liveUser.position} />
                <Fact label={t('user.unitMain')} value={liveUser.unitMain} />
                <Fact label={t('user.category')} value={liveUser.category} />
                <Fact label={t('user.shpkCode')} value={liveUser.shpkCode} />
                <Fact label={t('user.shpkNumber')} value={formatShpkNumber(liveUser.shpkNumber)} />
            </InfoCard>

            <InfoCard title={t('sections.basic')} icon={<IdCard />}>
                <Fact
                    label={t('user.dateOfBirth')}
                    value={
                        isEmpty(liveUser.dateOfBirth)
                            ? null
                            : `${liveUser.dateOfBirth}${age !== null ? ` · ${age} р.` : ''}`
                    }
                />
                <Fact label={t('user.phoneNumber')} value={liveUser.phoneNumber} />
                <Fact label={t('user.email')} value={liveUser.email} />
                <Fact label={t('user.callsign')} value={liveUser.callsign} />
                <Fact label={t('user.rights')} value={liveUser.rights} />
                <Fact label={t('user.education')} value={liveUser.education} />
                <Fact label={t('user.awards')} value={liveUser.awards} />
                <Fact label="Інформація про сімʼю" value={liveUser.familyInfo} wide />
                <Fact label={t('user.notes')} value={liveUser.notes} wide />
            </InfoCard>

            {(liveUser.relatives?.length ?? 0) > 0 && (
                <UserRelatives relatives={liveUser.relatives ?? []} />
            )}

            <button
                onClick={() => setShowFullInfo((prev) => !prev)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary-ink"
            >
                <ChevronDown
                    className={cn('size-4 transition-transform', showFullInfo && 'rotate-180')}
                />
                {showFullInfo ? t('rightBar.showLess') : 'Показати всі дані'}
            </button>

            {showFullInfo && (
                <div className="animate-fade-in space-y-4">
                    <InfoCard title={t('sections.hierarchy')}>
                        <Fact label={t('user.unitMain')} value={liveUser.unitMain} />
                        <Fact label={t('user.unitLevel1')} value={liveUser.unitLevel1} />
                        <Fact label={t('user.unitLevel2')} value={liveUser.unitLevel2} />
                        <Fact label={t('user.platoon')} value={liveUser.platoon} />
                        <Fact label={t('user.squad')} value={liveUser.squad} />
                        <Fact label={t('user.subordination')} value={liveUser.subordination} />
                    </InfoCard>

                    <InfoCard title={t('sections.militarySpecialization')}>
                        <Fact label={t('user.vosCode')} value={liveUser.vosCode} />
                        <Fact label={t('user.shpkCode')} value={liveUser.shpkCode} />
                        <Fact label={t('user.shpkNumber')} value={liveUser.shpkNumber} />
                        <Fact label={t('user.category')} value={liveUser.category} />
                        <Fact label={t('user.kshp')} value={liveUser.kshp} />
                    </InfoCard>

                    <InfoCard title={t('sections.rankAndAppointment')}>
                        <Fact label={t('user.rankAssignedBy')} value={liveUser.rankAssignedBy} />
                        <Fact
                            label={t('user.rankAssignmentDate')}
                            value={liveUser.rankAssignmentDate}
                        />
                        <Fact
                            label={t('user.appointmentOrder')}
                            value={liveUser.appointmentOrder}
                        />
                        <Fact label={t('user.previousStatus')} value={liveUser.previousStatus} />
                    </InfoCard>

                    <InfoCard title={t('sections.personalDetails')}>
                        <Fact label={t('user.placeOfBirth')} value={liveUser.placeOfBirth} />
                        <Fact label={t('user.taxId')} value={liveUser.taxId} />
                        <Fact label={t('user.serviceType')} value={liveUser.serviceType} />
                        <Fact
                            label={t('user.recruitmentOfficeDetails')}
                            value={liveUser.recruitmentOfficeDetails}
                        />
                        <Fact label={t('user.ubdStatus')} value={liveUser.ubdStatus} />
                        <Fact label={t('user.childrenInfo')} value={liveUser.childrenInfo} />
                        <Fact label={t('user.gender')} value={liveUser.gender} />
                    </InfoCard>

                    <InfoCard title={t('sections.absenceStatus')}>
                        <Fact label={t('user.bzvpStatus')} value={liveUser.bzvpStatus} />
                        <Fact label={t('user.rvbzPresence')} value={liveUser.rvbzPresence} />
                        <Fact label={t('user.absenceReason')} value={liveUser.absenceReason} />
                        <Fact label={t('user.absenceFromDate')} value={liveUser.absenceFromDate} />
                        <Fact label={t('user.absenceToDate')} value={liveUser.absenceToDate} />
                    </InfoCard>

                    <InfoCard title={t('sections.positionCases')}>
                        <Fact
                            label={t('user.positionNominative')}
                            value={liveUser.positionNominative}
                        />
                        <Fact label={t('user.tDotData')} value={liveUser.tDotData} />
                        <Fact
                            label={t('user.personalPrisonFileExists')}
                            value={liveUser.personalPrisonFileExists}
                        />
                    </InfoCard>
                </div>
            )}
        </div>
    );
}
