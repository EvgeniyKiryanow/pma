import { Flag, Pencil, Trash2 } from 'lucide-react';

import type { User } from '../../../../shared/types/user';
import { historyApi } from '../../../shared/api/personnel';
import { StatusDot } from '../../../shared/components/StatusBadge';
import { cn, IconButton } from '../../../shared/ui';
import { toast } from '../../../shared/ui/toast';
import { StatusExcel } from '../../../shared/utils/excelUserStatuses';
import { getCategoryBadge, getUnitBadge } from '../../../shared/utils/posadyBadgeHelper';
import { usePermissions } from '../../../stores/sessionStore';
import { useUserStore } from '../../../stores/userStore';
import type { ShtatnaPosada } from '../model/useShtatniStore';

type GroupedEntry = {
    type: 'header' | 'pos';
    data: string | ShtatnaPosada;
};

type Props = {
    groupedWithHeaders: GroupedEntry[];
    users: User[];
    onEdit: (pos: ShtatnaPosada) => void;
    onDelete: (shtat_number: string) => void;
    onAssign: (userId: number, pos: ShtatnaPosada) => void;
    onUnassign: (pos: ShtatnaPosada) => void;
};

const COLUMNS = 8;

export default function ShtatniPosadyTable({
    groupedWithHeaders,
    users,
    onEdit,
    onDelete,
    onAssign,
    onUnassign,
}: Props) {
    const updateUser = useUserStore((s) => s.updateUser);
    const { can } = usePermissions();
    const canEditStaffing = can('staffing.edit');
    const canAssign = can('personnel.edit');

    return (
        <div className="card h-full overflow-auto">
            <table className="data-table">
                <thead>
                    <tr>
                        <th className="w-16">№</th>
                        <th>Підрозділ</th>
                        <th>Посада</th>
                        <th>Кат</th>
                        <th>ШПК</th>
                        <th>Призначений військовослужбовець</th>
                        <th>Статус</th>
                        {canEditStaffing && <th className="w-20" />}
                    </tr>
                </thead>
                <tbody>
                    {groupedWithHeaders.map((item, idx) => {
                        if (item.type === 'header') {
                            return (
                                <tr key={`header-${idx}`} className="hover:bg-transparent">
                                    <td colSpan={COLUMNS} className="bg-primary-soft/60 py-2">
                                        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-primary-ink">
                                            <Flag className="size-3.5" />
                                            {item.data as string}
                                        </span>
                                    </td>
                                </tr>
                            );
                        }

                        const pos = item.data as ShtatnaPosada;
                        const unit = getUnitBadge(pos.unit_name);
                        const category = getCategoryBadge(pos.category);
                        const matchedUser = users.find((u) => u.shpkNumber === pos.shtat_number);

                        return (
                            <tr key={pos.shtat_number} className="group">
                                <td className="font-mono text-xs font-medium text-ink-2">
                                    {pos.shtat_number}
                                </td>
                                <td>
                                    <span
                                        className={cn(
                                            'inline-flex max-w-[220px] items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs',
                                            unit.badgeStyle,
                                        )}
                                    >
                                        {unit.icon}
                                        <span className="truncate">{pos.unit_name || '—'}</span>
                                    </span>
                                </td>
                                <td className="min-w-[180px] font-medium">
                                    {pos.position_name || '—'}
                                </td>
                                <td>
                                    {pos.category ? (
                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs',
                                                category.badgeStyle,
                                            )}
                                        >
                                            {category.icon}
                                            {pos.category}
                                        </span>
                                    ) : (
                                        <span className="text-ink-3">—</span>
                                    )}
                                </td>
                                <td className="font-mono text-xs text-ink-2">
                                    {pos.shpk_code || '—'}
                                </td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        {!matchedUser && (
                                            <span className="shrink-0 rounded-md bg-warning-soft px-1.5 py-0.5 text-[11px] font-medium text-warning-ink">
                                                Вакантна
                                            </span>
                                        )}
                                        <select
                                            className="field field-sm max-w-[240px]"
                                            value={matchedUser?.id || ''}
                                            disabled={!canAssign}
                                            onChange={(e) => {
                                                const selectedValue = e.target.value;
                                                if (selectedValue === 'remove') {
                                                    onUnassign(pos);
                                                } else {
                                                    const userId = Number(selectedValue);
                                                    if (userId) onAssign(userId, pos);
                                                }
                                            }}
                                        >
                                            <option value="">— Обрати військовослужбовця —</option>
                                            {matchedUser && (
                                                <option value="remove">✖ Зняти з посади</option>
                                            )}
                                            {users
                                                .filter(
                                                    (u) =>
                                                        !u.shpkNumber ||
                                                        u.shpkNumber === pos.shtat_number,
                                                )
                                                .map((u) => (
                                                    <option key={u.id} value={u.id}>
                                                        {u.fullName}
                                                        {u.shpkNumber === pos.shtat_number
                                                            ? ' (призначений)'
                                                            : ''}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                </td>
                                <td>
                                    {matchedUser ? (
                                        <div className="flex items-center gap-2">
                                            <StatusDot status={matchedUser.soldierStatus} />
                                            <select
                                                className="field field-sm max-w-[240px]"
                                                value={matchedUser.soldierStatus || ''}
                                                disabled={!canAssign}
                                                onChange={async (e) => {
                                                    const newStatus = e.target.value;
                                                    const previousStatus =
                                                        matchedUser.soldierStatus;

                                                    await historyApi.add(matchedUser.id, {
                                                        id: Date.now(),
                                                        date: new Date().toISOString(),
                                                        type: 'statusChange',
                                                        author: 'System',
                                                        description: `Статус змінено з "${previousStatus}" → "${newStatus}"`,
                                                        content: `Статус змінено з "${previousStatus}" на "${newStatus}"`,
                                                        files: [],
                                                    });
                                                    await updateUser({
                                                        ...matchedUser,
                                                        soldierStatus: newStatus,
                                                    });
                                                    toast.success(
                                                        `${matchedUser.fullName}: статус змінено`,
                                                    );
                                                }}
                                            >
                                                <option value="">— Обрати статус —</option>
                                                {Object.values(StatusExcel).map((s) => (
                                                    <option key={s} value={s}>
                                                        {s}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <span className="text-ink-3">—</span>
                                    )}
                                </td>

                                {canEditStaffing && (
                                    <td>
                                        <div className="flex justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                                            <IconButton
                                                label="Редагувати посаду"
                                                size="xs"
                                                onClick={() => onEdit(pos)}
                                                icon={<Pencil className="size-3.5" />}
                                            />
                                            <IconButton
                                                label="Видалити посаду"
                                                size="xs"
                                                className="hover:bg-danger-soft hover:text-danger-ink"
                                                onClick={() => onDelete(pos.shtat_number)}
                                                icon={<Trash2 className="size-3.5" />}
                                            />
                                        </div>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
