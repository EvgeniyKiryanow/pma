import {
    Award,
    BriefcaseBusiness,
    Building2,
    CalendarRange,
    CircleAlert,
    FilterX,
    Layers,
    ShieldHalf,
    Tag,
    UserRoundSearch,
} from 'lucide-react';
import { type ReactNode, useMemo } from 'react';

import { useShtatniStore } from '../../../../entities/shtatna-posada/model/useShtatniStore';
import { cn, SearchInput } from '../../../../shared/ui';
import { MultiSelect } from '../../../../shared/ui/MultiSelect';
import { useI18nStore } from '../../../../stores/i18nStore';
import { useUserStore } from '../../../../stores/userStore';
import {
    activeFilterCount,
    buildStaffRows,
    facetOf,
    filterStaffRows,
    type ListFilterKey,
    NO_VALUE,
    type Occupancy,
    type Presence,
    type StaffFilter,
    VACANT,
} from '../../model/staffReport';
import { useStaffReportView } from '../../model/staffReportStore';

/**
 * Filters of «Штатний звіт», above the table (not printed). What the table shows is what is
 * printed and exported. Every list says how many positions each choice would leave.
 */
export function StaffReportFilters() {
    const { t } = useI18nStore();
    const positions = useShtatniStore((s) => s.shtatniPosady);
    const users = useUserStore((s) => s.users);
    const periods = useStaffReportView((s) => s.periods);
    const filter = useStaffReportView((s) => s.filter);
    const setFilter = useStaffReportView((s) => s.setFilter);
    const resetFilter = useStaffReportView((s) => s.resetFilter);

    const rows = useMemo(
        () => buildStaffRows(positions, users, periods),
        [positions, users, periods],
    );
    const shown = useMemo(() => filterStaffRows(rows, filter), [rows, filter]);
    const active = activeFilterCount(filter);
    const filled = shown.filter((row) => row.userId !== null).length;

    const labelOf = (value: string) =>
        value === VACANT
            ? t('staffFilters.vacant')
            : value === NO_VALUE
              ? t('staffFilters.empty')
              : value;
    const list = (key: ListFilterKey, label: string, icon: ReactNode) => (
        <MultiSelect
            label={label}
            icon={icon}
            options={facetOf(rows, filter, key).map((option) => ({
                ...option,
                label: labelOf(option.value),
            }))}
            selected={filter[key]}
            onChange={(selected) => setFilter({ [key]: selected } as Partial<StaffFilter>)}
        />
    );

    return (
        <div className="space-y-2.5 border-b border-line bg-surface px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
                <SearchInput
                    value={filter.query}
                    onChange={(query) => setFilter({ query })}
                    placeholder={t('staffFilters.search')}
                    className="w-72"
                />
                {list('units', t('staffFilters.unit'), <Building2 />)}
                {list('positions', t('staffFilters.position'), <BriefcaseBusiness />)}
                {list('ranks', t('staffFilters.rank'), <ShieldHalf />)}
                {list('categories', t('staffFilters.category'), <Layers />)}
                {list('statuses', t('staffFilters.status'), <Tag />)}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Segmented<Occupancy>
                    value={filter.occupancy}
                    onChange={(occupancy) => setFilter({ occupancy })}
                    options={[
                        ['all', t('staffFilters.occupancyAll')],
                        ['filled', t('staffFilters.occupancyFilled')],
                        ['vacant', t('staffFilters.occupancyVacant')],
                    ]}
                />
                <Segmented<Presence>
                    value={filter.presence}
                    onChange={(presence) => setFilter({ presence })}
                    options={[
                        ['all', t('staffFilters.presenceAll')],
                        ['present', t('staffFilters.presencePresent')],
                        ['absent', t('staffFilters.presenceAbsent')],
                        ['unknown', t('staffFilters.presenceUnknown')],
                    ]}
                />
                <Toggle
                    on={filter.withNote}
                    onChange={(withNote) => setFilter({ withNote })}
                    icon={<CircleAlert />}
                    label={t('staffFilters.withNote')}
                />
                <Toggle
                    on={filter.withAwards}
                    onChange={(withAwards) => setFilter({ withAwards })}
                    icon={<Award />}
                    label={t('staffFilters.withAwards')}
                />
                <Toggle
                    on={filter.incomplete}
                    onChange={(incomplete) => setFilter({ incomplete })}
                    icon={<UserRoundSearch />}
                    label={t('staffFilters.incomplete')}
                    title={t('staffFilters.incompleteHint')}
                />
                <label
                    className={cn(
                        'flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px]',
                        filter.periodFrom || filter.periodTo
                            ? 'border-primary bg-primary-soft text-primary-ink'
                            : 'border-line-strong bg-surface text-ink-2',
                    )}
                    title={t('staffFilters.periodHint')}
                >
                    <CalendarRange className="size-4 shrink-0" />
                    <span className="font-medium">{t('staffFilters.period')}</span>
                    <input
                        type="date"
                        value={filter.periodFrom}
                        onChange={(e) => setFilter({ periodFrom: e.target.value })}
                        aria-label={t('staffFilters.periodFrom')}
                        className="bg-transparent text-[13px] outline-none"
                    />
                    <span>—</span>
                    <input
                        type="date"
                        value={filter.periodTo}
                        onChange={(e) => setFilter({ periodTo: e.target.value })}
                        aria-label={t('staffFilters.periodTo')}
                        className="bg-transparent text-[13px] outline-none"
                    />
                </label>

                <div className="ml-auto flex items-center gap-3">
                    <p className="text-[13px] tabular-nums text-ink-3" role="status">
                        {t('staffFilters.shown', {
                            shown: shown.length,
                            total: rows.length,
                            filled,
                            vacant: shown.length - filled,
                        })}
                    </p>
                    {active > 0 && (
                        <button
                            type="button"
                            onClick={resetFilter}
                            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-danger-ink hover:bg-danger-soft"
                        >
                            <FilterX className="size-4" />
                            {t('staffFilters.reset', { count: active })}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Segmented<T extends string>({
    value,
    onChange,
    options,
}: {
    value: T;
    onChange: (value: T) => void;
    options: [T, string][];
}) {
    return (
        <div className="flex h-9 items-center rounded-lg border border-line-strong bg-surface-2 p-0.5">
            {options.map(([key, label]) => (
                <button
                    key={key}
                    type="button"
                    aria-pressed={value === key}
                    onClick={() => onChange(key)}
                    className={cn(
                        'h-full rounded-md px-2.5 text-[13px] transition-colors',
                        value === key
                            ? 'bg-surface font-medium text-primary-ink shadow-card'
                            : 'text-ink-3 hover:text-ink',
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

function Toggle({
    on,
    onChange,
    icon,
    label,
    title,
}: {
    on: boolean;
    onChange: (on: boolean) => void;
    icon: ReactNode;
    label: string;
    title?: string;
}) {
    return (
        <button
            type="button"
            aria-pressed={on}
            title={title}
            onClick={() => onChange(!on)}
            className={cn(
                'flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] transition-colors [&_svg]:size-4',
                on
                    ? 'border-primary bg-primary-soft font-medium text-primary-ink'
                    : 'border-line-strong bg-surface text-ink-2 hover:bg-surface-2',
            )}
        >
            {icon}
            {label}
        </button>
    );
}
