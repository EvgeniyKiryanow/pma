import { FileClock, UserPlus, Users, UserX } from 'lucide-react';
import { useMemo, useState } from 'react';

import LeftBar from '../features/manager/ui/LeftBar';
import RightBar from '../features/manager/ui/RightBar';
import RozporyadzhennyaTab from '../features/manager/ui/RozporyadzhennyaTab';
import VyklyucheniTab from '../features/manager/ui/VyklyucheniTab';
import { Button, EmptyState, Tabs } from '../shared/ui';
import PageHeader from '../shared/ui/PageHeader';
import { useI18nStore } from '../stores/i18nStore';
import { usePermissions } from '../stores/sessionStore';
import { useUserStore } from '../stores/userStore';

type SubTab = 'main' | 'orders' | 'excluded';

const isOnOrder = (shpk: unknown) => typeof shpk === 'string' && shpk.includes('order');

export default function ManagerTab() {
    const { t } = useI18nStore();
    const { can } = usePermissions();
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('main');
    const users = useUserStore((s) => s.users);
    const selectedUser = useUserStore((s) => s.selectedUser);
    const setSelectedUser = useUserStore((s) => s.setSelectedUser);
    const openUserFormForAdd = useUserStore((s) => s.openUserFormForAdd);

    const { staff, orderedCount, excludedCount } = useMemo(
        () => ({
            staff: users.filter((u) => u.shpkNumber !== 'excluded' && !isOnOrder(u.shpkNumber)),
            orderedCount: users.filter((u) => isOnOrder(u.shpkNumber)).length,
            excludedCount: users.filter((u) => u.shpkNumber === 'excluded').length,
        }),
        [users],
    );

    const handleTabChange = (tabId: SubTab) => {
        setActiveSubTab(tabId);
        setSelectedUser(null); // a person from another list must not stay open
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <PageHeader
                tabs={
                    <Tabs
                        value={activeSubTab}
                        onChange={handleTabChange}
                        items={[
                            {
                                value: 'main',
                                label: 'Штат / за списком',
                                icon: <Users />,
                                count: staff.length,
                            },
                            {
                                value: 'orders',
                                label: 'Розпорядження',
                                icon: <FileClock />,
                                count: orderedCount,
                            },
                            {
                                value: 'excluded',
                                label: 'Виключені',
                                icon: <UserX />,
                                count: excludedCount,
                            },
                        ]}
                    />
                }
                actions={
                    can('personnel.create') && (
                        <Button
                            size="sm"
                            icon={<UserPlus className="size-4" />}
                            onClick={openUserFormForAdd}
                        >
                            {t('header.addUser')}
                        </Button>
                    )
                }
            />

            <div className="flex min-h-0 flex-1">
                {activeSubTab === 'main' ? (
                    <>
                        <LeftBar users={staff} />
                        {!isOnOrder(selectedUser?.shpkNumber) ? (
                            <RightBar />
                        ) : (
                            <div className="flex flex-1 items-center justify-center p-8">
                                <EmptyState
                                    icon={<FileClock />}
                                    title="Військовослужбовець у розпорядженні"
                                    description="Його картка тепер у вкладці «Розпорядження»."
                                    action={
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setActiveSubTab('orders')}
                                        >
                                            Перейти до розпоряджень
                                        </Button>
                                    }
                                />
                            </div>
                        )}
                    </>
                ) : activeSubTab === 'orders' ? (
                    <RozporyadzhennyaTab />
                ) : (
                    <VyklyucheniTab />
                )}
            </div>
        </div>
    );
}
