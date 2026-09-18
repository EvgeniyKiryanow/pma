import { Bell, Cake, CalendarClock, Hourglass } from 'lucide-react';
import pLimit from 'p-limit';
import { type ReactNode, useEffect, useState } from 'react';

import { useI18nStore } from '../../stores/i18nStore';
import { useSessionStore } from '../../stores/sessionStore';
import { Avatar, cn, EmptyState, Modal, railChipClass, Tabs } from '../ui';
import { StatusExcel } from '../utils/excelUserStatuses';

type EventItem = {
    id: number;
    name: string;
    dateLabel: string;
    age?: number;
    daysLeft?: number;
    soldierStatus?: string;
};

type EventTab = { key: string; label: string; icon: ReactNode; items: EventItem[] };

const TAB_DESCRIPTIONS: Record<string, string> = {
    birthdays: 'Військовослужбовці, у яких день народження протягом 7 днів.',
    orders: 'Розпорядження, термін дії яких завершується найближчим часом.',
    'ending-status':
        'Військовослужбовці, у яких найближчим часом завершується поточний статус (ВЛК, шпиталь тощо).',
};

function daysLeftLabel(days: number): string {
    if (days < 0) return `прострочено на ${Math.abs(days)} дн.`;
    if (days === 0) return 'сьогодні';
    if (days === 1) return 'завтра';
    return `через ${days} дн.`;
}

function EventsModal({ tabs, onClose }: { tabs: EventTab[]; onClose: () => void }) {
    const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? '');
    const currentTab = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];

    return (
        <Modal
            open
            onClose={onClose}
            title="Важливі події"
            description={`Станом на ${new Date().toLocaleDateString('uk-UA')} — що потребує уваги`}
            icon={<Bell />}
            width="max-w-2xl"
            bodyClassName="p-0"
        >
            <div className="border-b border-line px-5 pt-1">
                <Tabs
                    value={currentTab?.key ?? ''}
                    onChange={setActiveTab}
                    items={tabs.map((tab) => ({
                        value: tab.key,
                        label: tab.label,
                        icon: tab.icon,
                        count: tab.items.length,
                    }))}
                />
            </div>
            <div className="px-5 py-4">
                <p className="mb-3 text-[13px] text-ink-3">
                    {TAB_DESCRIPTIONS[currentTab?.key ?? ''] ?? ''}
                </p>
                {!currentTab || currentTab.items.length === 0 ? (
                    <EmptyState icon={<CalendarClock />} title="Подій не знайдено" />
                ) : (
                    <ul className="space-y-2">
                        {currentTab.items.map((item) => (
                            <li
                                key={`${currentTab.key}-${item.id}`}
                                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3"
                            >
                                <Avatar name={item.name} size={36} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium text-ink">{item.name}</p>
                                    {item.soldierStatus && (
                                        <p className="truncate text-xs text-ink-3">
                                            {item.soldierStatus}
                                        </p>
                                    )}
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="font-mono text-[13px] tabular-nums text-ink">
                                        {item.dateLabel}
                                    </p>
                                    <p
                                        className={cn(
                                            'text-xs',
                                            item.daysLeft !== undefined && item.daysLeft <= 1
                                                ? 'font-medium text-danger-ink'
                                                : 'text-ink-3',
                                        )}
                                    >
                                        {item.age !== undefined
                                            ? `виповнюється ${item.age}`
                                            : item.daysLeft !== undefined
                                              ? daysLeftLabel(item.daysLeft)
                                              : ''}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Modal>
    );
}

export default function EventsModalLauncher() {
    const { t } = useI18nStore();
    const [showModal, setShowModal] = useState(false);
    const [birthdayItems, setBirthdayItems] = useState<EventItem[]>([]);
    const [orderItems, setOrderItems] = useState<EventItem[]>([]);
    const [endingStatusItems, setEndingStatusItems] = useState<EventItem[]>([]);

    async function fetchOrderEntriesFromDb() {
        // Birthdays and statuses still work for roles without access to orders.
        if (!useSessionStore.getState().can('directives.view')) return [];
        const raw = await window.electronAPI.directives.getAllByType('order');

        return raw.map((entry: any) => ({
            id: entry.id,
            userId: entry.userId,
            title: entry.title,
            description: entry.description ?? '',
            file: entry.file,
            date: entry.date,
            period: entry.period || { from: '', to: undefined },
        }));
    }

    useEffect(() => {
        const loadEvents = async () => {
            const today = new Date();
            const year = today.getFullYear();
            const [users, orderEntries] = await Promise.all([
                window.electronAPI.fetchUsersMetadata(),
                fetchOrderEntriesFromDb(),
            ]);

            const relevantStatuses = [
                StatusExcel.ABSENT_VLK,
                StatusExcel.ABSENT_HOSPITALIZED,
                StatusExcel.ABSENT_MEDICAL_COMPANY,
                StatusExcel.ABSENT_REHAB_LEAVE,
                StatusExcel.ABSENT_REHAB,
                StatusExcel.ABSENT_BUSINESS_TRIP,
                StatusExcel.ABSENT_SZO,
                StatusExcel.ABSENT_WOUNDED,
            ];

            const limit = pLimit(5); // limit to 5 parallel calls

            const usersWithRelevantStatus = users.filter((user: any) =>
                relevantStatuses.includes(user.soldierStatus?.trim() as StatusExcel),
            );

            const endingStatus: EventItem[] = [];

            await Promise.all(
                usersWithRelevantStatus.map((user: any) =>
                    limit(async () => {
                        const history: any[] = await window.electronAPI.getUserHistory(
                            user.id,
                            'all',
                        );

                        const matching = history
                            .filter(
                                (h) =>
                                    h.type === 'statusChange' &&
                                    h.description?.includes(`→ "${user.soldierStatus}"`),
                            )
                            .sort(
                                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
                            );

                        if (matching.length === 0) return;

                        const latest = matching[0];

                        const toDate = new Date(latest.period?.to);
                        const diffDays = Math.floor(
                            (toDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                        );

                        if (diffDays < -3 || diffDays > 7) return;

                        endingStatus.push({
                            id: user.id,
                            name: user.fullName,
                            dateLabel: toDate.toLocaleDateString('uk-UA'),
                            daysLeft: diffDays,
                            soldierStatus: user.soldierStatus,
                        });
                    }),
                ),
            );

            setEndingStatusItems(endingStatus);

            // Birthdays
            const birthdayList = users
                .filter(
                    (user: any) =>
                        user.dateOfBirth &&
                        user.shpkNumber !== 'excluded' &&
                        !String(user.shpkNumber).includes('order'),
                )
                .map((user: any) => {
                    const dob = new Date(user.dateOfBirth!);
                    const next = new Date(year, dob.getMonth(), dob.getDate());
                    if (next < today) next.setFullYear(year + 1);

                    const age = next.getFullYear() - dob.getFullYear();
                    const diffDays = Math.floor(
                        (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                    );

                    return {
                        user,
                        age,
                        diffDays,
                        dateLabel: `${next.getDate().toString().padStart(2, '0')}.${(
                            next.getMonth() + 1
                        )
                            .toString()
                            .padStart(2, '0')}`,
                    };
                })
                .filter((u: any) => u.diffDays >= 0 && u.diffDays <= 7)
                .map((entry: any) => ({
                    id: entry.user.id,
                    name: entry.user.fullName,
                    dateLabel: entry.dateLabel,
                    age: entry.age,
                }));

            setBirthdayItems(birthdayList);

            // Orders (розпорядження)
            const orderList = orderEntries
                .map((entry) => {
                    const user = users.find((u: any) => u.id === entry.userId);
                    if (!user || !entry.period?.to) return null;

                    const endDate = new Date(entry.period.to);
                    const diffDays = Math.floor(
                        (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                    );

                    // Show if ends in 7 days ahead OR up to 3 days ago
                    if (diffDays < -3 || diffDays > 7) return null;

                    return {
                        id: user.id,
                        name: user.fullName,
                        dateLabel: endDate.toLocaleDateString('uk-UA'),
                        daysLeft: diffDays,
                    };
                })
                .filter(Boolean);

            setOrderItems(orderList as EventItem[]);
        };

        void loadEvents();
    }, []);

    const totalCount = birthdayItems.length + orderItems.length + endingStatusItems.length;
    if (totalCount === 0) return null;

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className={railChipClass('brass')}
                title={t('shell.events')}
            >
                <Bell className="size-3.5" />
                <span className="tabular-nums">{totalCount}</span>
                <span className="hidden xl:inline">події</span>
            </button>

            {showModal && (
                <EventsModal
                    onClose={() => setShowModal(false)}
                    tabs={[
                        {
                            key: 'birthdays',
                            label: 'Дні народження',
                            icon: <Cake />,
                            items: birthdayItems,
                        },
                        {
                            key: 'orders',
                            label: 'Розпорядження',
                            icon: <CalendarClock />,
                            items: orderItems,
                        },
                        {
                            key: 'ending-status',
                            label: 'Завершення статусу',
                            icon: <Hourglass />,
                            items: endingStatusItems,
                        },
                    ].filter((tab) => tab.items.length > 0)}
                />
            )}
        </>
    );
}
