// autoApplyNamedListStatuses.ts
import { useNamedListStore } from './stores/useNamedListStore';
import { useUserStore } from './stores/userStore';
import { StatusExcel } from './utils/excelUserStatuses';

const statusToShort: Record<StatusExcel, string> = {
    [StatusExcel.ABSENT_REHAB]: 'вп',
    [StatusExcel.ABSENT_REHAB_LEAVE]: 'вп',
    [StatusExcel.ABSENT_BUSINESS_TRIP]: 'вд',
    [StatusExcel.ABSENT_HOSPITALIZED]: 'гп',
    [StatusExcel.ABSENT_MEDICAL_COMPANY]: 'гп',
    [StatusExcel.ABSENT_WOUNDED]: '300',
    [StatusExcel.ABSENT_SZO]: 'сзч',
    [StatusExcel.ABSENT_KIA]: '200',
    [StatusExcel.ABSENT_MIA]: '500',
    [StatusExcel.ABSENT_VLK]: 'влк',
    [StatusExcel.MANAGEMENT]: 'воп',
    [StatusExcel.SUPPLY_COMBAT]: 'воп',
    [StatusExcel.SUPPLY_GENERAL]: 'воп',
    [StatusExcel.NON_COMBAT_NEWCOMERS]: '+',
    [StatusExcel.NON_COMBAT_LIMITED_FITNESS]: '+',
    [StatusExcel.NON_COMBAT_LIMITED_FITNESS_IN_COMBAT]: '+',
    [StatusExcel.HAVE_OFFER_TO_HOS]: '+',
    [StatusExcel.ABSENT_REHABED_ON]: 'зв',
    [StatusExcel.POSITIONS_INFANTRY]: 'воп',
    [StatusExcel.POSITIONS_UAV]: 'воп',
    [StatusExcel.POSITIONS_BRONEGROUP]: 'бч',
    [StatusExcel.POSITIONS_CREW]: 'воп',
    [StatusExcel.POSITIONS_CALCULATION]: 'воп',
    [StatusExcel.POSITIONS_RESERVE_INFANTRY]: 'воп',
    [StatusExcel.NO_STATUS]: '',
    [StatusExcel.NON_COMBAT_REFUSERS]: '',
};

export function startNamedListAutoApply() {
    let applied = false;

    const interval = setInterval(async () => {
        const now = new Date();
        const hour = now.getHours();
        if (applied || hour < 10) return;

        const todayKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const dayIndex = now.getDate() - 1;

        const store = useNamedListStore.getState();
        const users = useUserStore.getState().users;
        const rows = store.tables[todayKey];

        if (!rows || rows.every((r) => r.attendance[dayIndex] !== '')) return;

        console.log('⏰ [Auto Apply] Starting...');

        const { setActiveKey, updateCell } = useNamedListStore.getState();
        let { activeKey } = useNamedListStore.getState();

        // 🔁 Make sure activeKey is set
        if (!activeKey) {
            setActiveKey(todayKey);
            activeKey = todayKey;
        }

        if (activeKey !== todayKey) {
            console.warn('🚫 [Auto Apply] Active key does not match today’s table');
            return;
        }

        let appliedCount = 0;

        for (const user of users) {
            const short = statusToShort[user.soldierStatus as StatusExcel];
            if (!short || !user.shpkNumber) continue;

            const row = rows.find((r) => r.shpkNumber === user.shpkNumber);
            if (!row) continue;

            if (!row.attendance[dayIndex]) {
                console.debug('✅ [Auto Apply] Applying:', {
                    name: user.fullName,
                    shpkNumber: user.shpkNumber,
                    short,
                    dayIndex,
                });

                await updateCell(todayKey, row.id, dayIndex, short);
                appliedCount++;
            }
        }

        if (appliedCount > 0) {
            console.log(`✅ [Auto Apply] Applied ${appliedCount} statuses`);
        } else {
            console.log('ℹ️ [Auto Apply] No statuses applied – already filled');
        }

        applied = true;
    }, 10_000);

    return () => clearInterval(interval);
}
