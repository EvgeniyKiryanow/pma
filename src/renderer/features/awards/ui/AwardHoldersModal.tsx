import { Medal, Paperclip } from 'lucide-react';

import { type AwardDef, awardTitle } from '../../../../shared/awards/catalog';
import AwardIcon from '../../../entities/user/ui/card/AwardIcon';
import { AwardStatusBadge } from '../../../entities/user/ui/card/AwardPicker';
import { EmptyState, Modal } from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';
import { useUserStore } from '../../../stores/userStore';
import { holdersOf } from '../model/registry';

export function openPersonCard(id: number): void {
    const store = useUserStore.getState();
    const user = store.users.find((u) => u.id === id);
    if (!user) return;
    store.setCurrentTab('manager');
    void store.setSelectedUser(user);
}

/** Who holds an award of the register (or is submitted for it). */
export default function AwardHoldersModal({
    award,
    onClose,
}: {
    award: AwardDef;
    onClose: () => void;
}) {
    const { t } = useI18nStore();
    const users = useUserStore((s) => s.users);
    const holders = holdersOf(users, award.id);

    return (
        <Modal
            open
            onClose={onClose}
            title={award.name}
            description={[
                t(`awards.groups.${award.group}`),
                award.body,
                award.awardedBy,
                award.established,
            ]
                .filter(Boolean)
                .join(' · ')}
            icon={<Medal />}
            width="max-w-3xl"
            bodyClassName="p-0"
        >
            {award.notes && (
                <p className="border-b border-line px-5 py-3 text-[13px] text-ink-2">
                    {award.notes}
                </p>
            )}
            {holders.length === 0 ? (
                <EmptyState
                    icon={<Medal />}
                    title={t('awards.registry.noHolders')}
                    description={t('awards.registry.noHoldersHint')}
                />
            ) : (
                <ul className="divide-y divide-line">
                    {holders.map(({ user, record }) => {
                        const order = [
                            record.orderNumber && `№ ${record.orderNumber}`,
                            record.orderDate && `від ${record.orderDate}`,
                        ]
                            .filter(Boolean)
                            .join(' ');
                        return (
                            <li key={`${user.id}-${record.id}`}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        openPersonCard(user.id);
                                    }}
                                    className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface-2"
                                >
                                    <AwardIcon
                                        awardId={record.awardId}
                                        degree={record.degree}
                                        size={32}
                                        muted={
                                            record.status !== 'awarded' &&
                                            record.status !== 'presented'
                                        }
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-ink">
                                            {[user.rank, user.fullName].filter(Boolean).join(' ')}
                                        </span>
                                        <span className="block truncate text-xs text-ink-3">
                                            {[
                                                record.degree ? awardTitle(record) : null,
                                                user.position,
                                                order,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </span>
                                    </span>
                                    {record.files?.length ? (
                                        <span
                                            className="flex items-center gap-1 text-xs text-ink-3"
                                            title={t('awards.files.title')}
                                        >
                                            <Paperclip className="size-3.5" />
                                            {record.files.length}
                                        </span>
                                    ) : null}
                                    <AwardStatusBadge status={record.status} />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Modal>
    );
}
