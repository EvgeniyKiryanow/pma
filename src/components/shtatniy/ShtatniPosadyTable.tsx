// components/ShtatniPosadyTable.tsx
import { Pencil, Trash2 } from 'lucide-react';
import {
    getCategoryBadge,
    getPositionBadge,
    getShpkBadge,
    getUnitBadge,
} from '../../utils/posadyBadgeHelper';
import type { User, CommentOrHistoryEntry } from '../../types/user';
import type { ShtatnaPosada } from '../../stores/useShtatniStore';

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

export default function ShtatniPosadyTable({
    groupedWithHeaders,
    users,
    onEdit,
    onDelete,
    onAssign,
    onUnassign,
}: Props) {
    return (
        <div className="overflow-x-auto border rounded shadow bg-white">
            <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 text-gray-700">
                    <tr>
                        <th className="border px-2 py-1 text-left w-20">№</th>
                        <th className="border px-2 py-1 text-left">Підрозділ</th>
                        <th className="border px-2 py-1 text-left">Посада</th>
                        <th className="border px-2 py-1 text-left">Кат</th>
                        <th className="border px-2 py-1 text-left">ШПК</th>
                        <th className="border px-2 py-1 text-left">Призначений користувач</th>
                        <th className="border px-2 py-1 text-center w-20">Дії</th>
                    </tr>
                </thead>
                <tbody>
                    {groupedWithHeaders.map((item, idx) => {
                        if (item.type === 'header') {
                            return (
                                <tr key={`header-${idx}`} className="bg-green-100">
                                    <td
                                        colSpan={7}
                                        className="px-3 py-1 font-semibold text-green-800 text-left"
                                    >
                                        {item.data as string}
                                    </td>
                                </tr>
                            );
                        }

                        const pos = item.data as ShtatnaPosada;
                        const unit = getUnitBadge(pos.unit_name);
                        const position = getPositionBadge(pos.position_name);
                        const category = getCategoryBadge(pos.category);
                        const shpk = getShpkBadge(pos.shpk_code);
                        const matchedUser = users.find((u) => u.shpkNumber === pos.shtat_number);

                        return (
                            <tr key={pos.shtat_number} className="hover:bg-gray-50 transition">
                                <td className="border px-2 py-1 font-medium text-gray-800">
                                    {pos.shtat_number}
                                </td>
                                <td className="border px-2 py-1">
                                    <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${unit.badgeStyle}`}
                                    >
                                        {unit.icon} {pos.unit_name || '-'}
                                    </span>
                                </td>
                                <td className="border px-2 py-1">
                                    <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${position.badgeStyle}`}
                                    >
                                        {position.icon} {pos.position_name || '-'}
                                    </span>
                                </td>
                                <td className="border px-2 py-1">
                                    <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${category.badgeStyle}`}
                                    >
                                        {category.icon} {pos.category || '-'}
                                    </span>
                                </td>
                                <td className="border px-2 py-1">
                                    <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${shpk.badgeStyle}`}
                                    >
                                        {shpk.icon} {pos.shpk_code || '-'}
                                    </span>
                                </td>
                                <td className="border px-2 py-1">
                                    <select
                                        className="text-xs border rounded px-1 py-0.5 max-w-[180px]"
                                        value={matchedUser?.id || ''}
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
                                        <option value="">-- Обрати користувача --</option>
                                        {matchedUser && (
                                            <option value="remove">✖ Зняти користувача</option>
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
                                                        ? ' ✅ (призначений)'
                                                        : ''}
                                                </option>
                                            ))}
                                    </select>
                                </td>
                                <td className="border px-2 py-1 text-center">
                                    <button
                                        onClick={() => onEdit(pos)}
                                        className="p-1 rounded bg-yellow-200 hover:bg-yellow-300"
                                    >
                                        <Pencil className="w-4 h-4 text-yellow-800" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(pos.shtat_number)}
                                        className="p-1 ml-1 rounded bg-red-500 hover:bg-red-600 text-white"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
