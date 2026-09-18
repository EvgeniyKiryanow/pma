import { BookMarked, FileDown, Medal, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { allAwards, isGranted } from '../../shared/awards/catalog';
import { useAwardTypesStore } from '../entities/award/model/awardTypesStore';
import { generateAwardsExcel } from '../features/awards/excel/generateAwardsExcel';
import AwardsRegistry from '../features/awards/ui/AwardsRegistry';
import { AwardsReportTable } from '../features/awards/ui/AwardsReportTable';
import { Button, Tabs } from '../shared/ui';
import PageHeader from '../shared/ui/PageHeader';
import { useI18nStore } from '../stores/i18nStore';
import { useSearchJump } from '../stores/searchJumpStore';
import { useUserStore } from '../stores/userStore';

type View = 'registry' | 'holders';

/** «Нагороди»: the register of every award and who holds them. Awards are given in the card. */
export default function AwardsTab() {
    const { t } = useI18nStore();
    const [view, setView] = useState<View>('registry');
    const awardsJump = useSearchJump((s) => s.jumps.awards);
    useEffect(() => {
        if (awardsJump !== undefined) setView('registry');
    }, [awardsJump]);
    const users = useUserStore((s) => s.users);
    const version = useAwardTypesStore((s) => s.version);

    const stats = useMemo(() => {
        const records = users.flatMap((user) =>
            Array.isArray(user.awardRecords) ? user.awardRecords : [],
        );
        const catalogue = allAwards().filter((award) => award.id !== 'other');
        return {
            catalogue: catalogue.length,
            own: catalogue.filter((award) => award.custom).length,
            people: users.filter((user) => (user.awardRecords ?? []).some(isGranted)).length,
            granted: records.filter(isGranted).length,
            pending: records.filter((r) => r.status === 'draft' || r.status === 'submitted').length,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `version`: own awards changed
    }, [users, version]);

    const tiles = [
        { label: t('awards.registry.statCatalogue'), value: stats.catalogue },
        { label: t('awards.registry.statOwn'), value: stats.own },
        { label: t('awards.registry.statPeople'), value: stats.people },
        { label: t('awards.registry.statGranted'), value: stats.granted },
        { label: t('awards.registry.statPending'), value: stats.pending },
    ];

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <PageHeader
                tabs={
                    <Tabs
                        value={view}
                        onChange={setView}
                        items={[
                            {
                                value: 'registry',
                                label: t('awards.registry.title'),
                                icon: <BookMarked />,
                            },
                            {
                                value: 'holders',
                                label: t('awards.registry.holders'),
                                icon: <UsersRound />,
                                count: stats.granted + stats.pending || undefined,
                            },
                        ]}
                    />
                }
                actions={
                    view === 'holders' ? (
                        <Button
                            size="sm"
                            variant="secondary"
                            icon={<FileDown className="size-4" />}
                            onClick={() => generateAwardsExcel()}
                        >
                            {t('awards.registry.exportExcel')}
                        </Button>
                    ) : null
                }
            />
            <div className="@container min-h-0 flex-1 overflow-auto p-5">
                <div className="mb-4 grid grid-cols-2 gap-3 @2xl:grid-cols-5">
                    {tiles.map((tile) => (
                        <div key={tile.label} className="card px-4 py-3">
                            <p className="text-xs text-ink-3">{tile.label}</p>
                            <p className="mt-1 text-xl font-semibold tabular-nums text-ink">
                                {tile.value}
                            </p>
                        </div>
                    ))}
                </div>
                <p className="mb-4 flex items-center gap-2 text-[13px] text-ink-3">
                    <Medal className="size-4 shrink-0" />
                    {t('awards.registry.hint')}
                </p>
                {view === 'registry' ? <AwardsRegistry /> : <AwardsReportTable />}
            </div>
        </div>
    );
}
