import { Medal } from 'lucide-react';
import { useMemo } from 'react';

import { AWARD_GROUPS, AWARD_STATUSES } from '../../../../../shared/awards/catalog';
import AwardIcon from '../../../../entities/user/ui/card/AwardIcon';
import { AwardStatusBadge } from '../../../../entities/user/ui/card/AwardPicker';
import { EmptyState, SearchInput } from '../../../../shared/ui';
import { useI18nStore } from '../../../../stores/i18nStore';
import { useUserStore } from '../../../../stores/userStore';
import {
    awardRows,
    type AwardStatusFilter,
    awardTotals,
    useAwardFilters,
} from '../../model/awardsReport';

function openCard(id: number): void {
    const store = useUserStore.getState();
    const user = store.users.find((u) => u.id === id);
    if (!user) return;
    store.setCurrentTab('manager');
    void store.setSelectedUser(user);
}

/** Every award of the personnel: who was submitted, who is awarded, the orders. */
export function AwardsReportTable() {
    const { t } = useI18nStore();
    const users = useUserStore((s) => s.users);
    const filters = useAwardFilters();
    const { status, group, query } = filters;
    const rows = useMemo(
        () => awardRows(users, { status, group, query }),
        [users, status, group, query],
    );
    const totals = awardTotals(rows);
    const anyAwards = users.some((user) => (user.awardRecords?.length ?? 0) > 0);

    if (!anyAwards) {
        return (
            <div className="card">
                <EmptyState
                    icon={<Medal />}
                    title={t('awards.report.empty')}
                    description={t('awards.report.emptyHint')}
                />
            </div>
        );
    }

    const th =
        'border border-gray-400 bg-gray-100 px-2 py-2 text-[12px] font-semibold text-gray-800';
    const td = 'border border-gray-400 px-2 py-1.5 align-top text-[12px] text-gray-900';

    return (
        <div className="space-y-4">
            <div className="card flex flex-wrap items-end gap-3 p-4 print:hidden">
                <SearchInput
                    className="min-w-60 flex-1"
                    value={filters.query}
                    onChange={(query) => filters.set({ query })}
                    placeholder={t('awards.report.search')}
                />
                <select
                    aria-label={t('awards.fields.status')}
                    className="field w-52"
                    value={filters.status}
                    onChange={(e) => filters.set({ status: e.target.value as AwardStatusFilter })}
                >
                    <option value="all">{t('awards.report.allStatuses')}</option>
                    <option value="granted">{t('awards.granted')}</option>
                    <option value="pending">{t('awards.inProgress')}</option>
                    {AWARD_STATUSES.map((status) => (
                        <option key={status} value={status}>
                            {t(`awards.statuses.${status}`)}
                        </option>
                    ))}
                </select>
                <select
                    aria-label={t('awards.fields.award')}
                    className="field w-64"
                    value={filters.group}
                    onChange={(e) => filters.set({ group: e.target.value as typeof filters.group })}
                >
                    <option value="all">{t('awards.report.allGroups')}</option>
                    {AWARD_GROUPS.map((group) => (
                        <option key={group.id} value={group.id}>
                            {t(`awards.groups.${group.id}`)}
                        </option>
                    ))}
                </select>
                <p className="w-full text-[13px] text-ink-3">
                    {t('awards.report.people')}: <b className="text-ink">{totals.people}</b>
                    <span className="mx-2">·</span>
                    {t('awards.report.records')}: <b className="text-ink">{totals.records}</b>
                    <span className="mx-2">·</span>
                    {t('awards.granted')}: <b className="text-ink">{totals.granted}</b>
                    <span className="mx-2">·</span>
                    {t('awards.inProgress')}: <b className="text-ink">{totals.pending}</b>
                </p>
            </div>

            <div className="paper overflow-x-auto p-4">
                <h2 className="mb-3 text-center text-base font-bold uppercase text-gray-900">
                    {t('awards.report.sheetTitle')}
                </h2>
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr>
                            <th className={th}>{t('awards.report.number')}</th>
                            <th className={th}>{t('awards.report.rank')}</th>
                            <th className={th}>{t('awards.report.person')}</th>
                            <th className={th}>{t('awards.report.position')}</th>
                            <th className={th}>{t('awards.fields.award')}</th>
                            <th className={th}>{t('awards.fields.awardedBy')}</th>
                            <th className={th}>{t('awards.fields.status')}</th>
                            <th className={th}>{t('awards.fields.submittedAt')}</th>
                            <th className={th}>{t('awards.fields.orderDate')}</th>
                            <th className={th}>{t('awards.fields.orderNumber')}</th>
                            <th className={th}>{t('awards.fields.presentedAt')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.key} className="hover:bg-gray-50">
                                <td className={`${td} text-center tabular-nums`}>{index + 1}</td>
                                <td className={td}>{row.user.rank}</td>
                                <td className={td}>
                                    <button
                                        type="button"
                                        onClick={() => openCard(row.user.id)}
                                        className="text-left font-medium hover:underline"
                                    >
                                        {row.user.fullName}
                                    </button>
                                </td>
                                <td className={td}>
                                    {row.user.position}
                                    {row.user.shpkNumber &&
                                        !String(row.user.shpkNumber).includes('order') &&
                                        row.user.shpkNumber !== 'excluded' && (
                                            <span className="text-gray-500">
                                                {' '}
                                                · №{row.user.shpkNumber}
                                            </span>
                                        )}
                                </td>
                                <td className={td}>
                                    <span className="flex items-start gap-2">
                                        <AwardIcon
                                            awardId={row.record.awardId}
                                            degree={row.record.degree}
                                            size={24}
                                        />
                                        <span>
                                            {row.title}
                                            {row.record.posthumous && (
                                                <span className="text-gray-500">
                                                    {' '}
                                                    ({t('awards.fields.posthumous').toLowerCase()})
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                </td>
                                <td className={td}>{row.record.awardedBy}</td>
                                <td className={td}>
                                    <AwardStatusBadge status={row.record.status} />
                                </td>
                                <td className={`${td} tabular-nums`}>{row.record.submittedAt}</td>
                                <td className={`${td} tabular-nums`}>{row.record.orderDate}</td>
                                <td className={td}>{row.record.orderNumber}</td>
                                <td className={`${td} tabular-nums`}>{row.record.presentedAt}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
