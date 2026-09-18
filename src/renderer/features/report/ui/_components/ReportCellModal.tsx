import { ListTree, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { User } from '../../../../../shared/types/user';
import type { ShtatnaPosada } from '../../../../entities/shtatna-posada/model/useShtatniStore';
import {
    assignToPosition,
    changeStatus,
    removeFromPosition,
} from '../../../../entities/user/model/personnelActions';
import { reportError } from '../../../../shared/api/errors';
import { StatusDot } from '../../../../shared/components/StatusBadge';
import { EmptyState, Modal } from '../../../../shared/ui';
import { toast } from '../../../../shared/ui/toast';
import { StatusExcel } from '../../../../shared/utils/excelUserStatuses';
import { usePermissions } from '../../../../stores/sessionStore';
import { useUserStore } from '../../../../stores/userStore';
import {
    type AlternateReport,
    isOnList,
    peopleIn,
    positionsIn,
    REPORT_COLUMNS,
    type ReportPerson,
    type ReportPosition,
    type ReportRow,
} from '../../model/alternateReport';

/** What was clicked: a cell of the report, or the «без статусу» notice above it. */
export type ReportCellTarget = { row: string; column: number } | 'without-status';

const STATUS_OPTIONS = Object.values(StatusExcel) as string[];
/** Full card of a person from the shared list (the report holds the same objects). */
function fullUser(id: number): User | undefined {
    return useUserStore.getState().users.find((user) => user.id === id);
}

function openCard(id: number): void {
    const user = fullUser(id);
    if (!user) return;
    const store = useUserStore.getState();
    store.setCurrentTab('manager');
    void store.setSelectedUser(user);
}

async function run(work: () => Promise<unknown>, done: string): Promise<void> {
    try {
        await work();
        toast.success(done);
    } catch (err) {
        reportError(err);
    }
}

function StatusSelect({ person, disabled }: { person: ReportPerson; disabled: boolean }) {
    const [busy, setBusy] = useState(false);
    const current = person.soldierStatus ?? '';
    return (
        <select
            className="field field-sm w-full max-w-[260px]"
            value={current}
            disabled={disabled || busy}
            onChange={async (event) => {
                const next = event.target.value;
                const user = fullUser(person.id);
                if (!user || next === current) return;
                setBusy(true);
                await run(() => changeStatus(user, next), `${person.fullName}: ${next}`);
                setBusy(false);
            }}
        >
            {!STATUS_OPTIONS.includes(current) && <option value={current}>{current || '—'}</option>}
            {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                    {status}
                </option>
            ))}
        </select>
    );
}

function PersonName({ person }: { person: ReportPerson }) {
    return (
        <button
            type="button"
            onClick={() => openCard(person.id)}
            title="Відкрити картку"
            className="text-left font-medium text-ink hover:text-primary-ink hover:underline"
        >
            {person.fullName}
        </button>
    );
}

function PeopleTable({ people, canEdit }: { people: ReportPerson[]; canEdit: boolean }) {
    if (!people.length) {
        return <EmptyState icon={<Users />} title="Тут нікого немає" />;
    }
    return (
        <table className="data-table">
            <thead>
                <tr>
                    <th className="w-10">№</th>
                    <th>ПІБ</th>
                    <th>Звання</th>
                    <th>Посада</th>
                    <th>Статус</th>
                </tr>
            </thead>
            <tbody>
                {people.map((person, index) => (
                    <tr key={person.id}>
                        <td className="tabular-nums text-ink-3">{index + 1}</td>
                        <td>
                            <PersonName person={person} />
                        </td>
                        <td className="text-ink-2">{person.rank || '—'}</td>
                        <td className="text-ink-2">{person.position || '—'}</td>
                        <td>
                            <div className="flex items-center gap-2">
                                <StatusDot status={person.soldierStatus} />
                                <StatusSelect person={person} disabled={!canEdit} />
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function PositionsTable({
    positions,
    report,
    canEdit,
}: {
    positions: ReportPosition[];
    report: AlternateReport;
    canEdit: boolean;
}) {
    const users = useUserStore((s) => s.users);
    const [busy, setBusy] = useState<string | null>(null);
    const holders = useMemo(() => {
        const byNumber = new Map<string, User>();
        for (const user of users) {
            if (report.positionOf.has(user.id)) byNumber.set(String(user.shpkNumber), user);
        }
        return byNumber;
    }, [users, report]);
    // People without a position first: they are who usually fills a vacancy.
    const candidates = useMemo(
        () =>
            users
                .filter(isOnList)
                .sort(
                    (a, b) =>
                        Number(report.positionOf.has(a.id)) - Number(report.positionOf.has(b.id)) ||
                        a.fullName.localeCompare(b.fullName, 'uk'),
                ),
        [users, report],
    );

    if (!positions.length) {
        return <EmptyState icon={<ListTree />} title="У БЧС тут немає посад" />;
    }

    const change = async (pos: ReportPosition, value: string) => {
        const holder = holders.get(String(pos.shtat_number));
        setBusy(String(pos.shtat_number));
        if (value === 'vacant') {
            if (holder) {
                await run(
                    () => removeFromPosition(holder, pos as ShtatnaPosada),
                    `${holder.fullName} знято з посади`,
                );
            }
        } else {
            const user = fullUser(Number(value));
            if (user) {
                await run(
                    () => assignToPosition(user, pos as ShtatnaPosada),
                    `${user.fullName} призначено на посаду «${pos.position_name}»`,
                );
            }
        }
        setBusy(null);
    };

    return (
        <table className="data-table">
            <thead>
                <tr>
                    <th className="w-16">№ за штатом</th>
                    <th>Посада</th>
                    <th>Кат.</th>
                    <th>Хто на посаді</th>
                </tr>
            </thead>
            <tbody>
                {positions.map((pos) => {
                    const holder = holders.get(String(pos.shtat_number));
                    return (
                        <tr key={pos.shtat_number}>
                            <td className="font-mono text-xs text-ink-2">{pos.shtat_number}</td>
                            <td>{pos.position_name || '—'}</td>
                            <td className="text-ink-2">{pos.category || '—'}</td>
                            <td>
                                <select
                                    className="field field-sm w-full max-w-[280px]"
                                    value={holder ? String(holder.id) : 'vacant'}
                                    disabled={!canEdit || busy === String(pos.shtat_number)}
                                    onChange={(event) => void change(pos, event.target.value)}
                                >
                                    <option value="vacant">— Вакантна —</option>
                                    {candidates.map((user) => (
                                        <option key={user.id} value={String(user.id)}>
                                            {user.fullName}
                                            {report.positionOf.has(user.id) &&
                                            user.id !== holder?.id
                                                ? ` (зараз № ${user.shpkNumber})`
                                                : ''}
                                        </option>
                                    ))}
                                </select>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

/**
 * Who is behind a number of the report, with the changes that move them: another status or a
 * vacancy filled. Every change is saved at once and the whole
 * report recounts.
 */
export function ReportCellModal({
    report,
    target,
    onClose,
}: {
    report: AlternateReport;
    target: ReportCellTarget;
    onClose: () => void;
}) {
    const { can } = usePermissions();
    const canEdit = can('personnel.edit');

    if (target === 'without-status') {
        return (
            <Modal
                open
                onClose={onClose}
                title="Без статусу"
                description="Ці люди не потрапляють ні в «В наявності», ні у «Відсутні». Оберіть кожному статус."
                icon={<Users />}
                width="max-w-4xl"
                bodyClassName="p-0"
            >
                <PeopleTable people={report.withoutStatus} canEdit={canEdit} />
            </Modal>
        );
    }

    const row: ReportRow | undefined = report.rows.find((r) => r.name === target.row);
    const column = REPORT_COLUMNS[target.column];
    if (!row || !column) return null;

    if (column.kind === 'planned') {
        const positions = positionsIn(row, column);
        return (
            <Modal
                open
                onClose={onClose}
                title={`${row.name} · ${column.label}`}
                description={`Посад: ${positions.length}. Оберіть людину, щоб призначити її на посаду.`}
                icon={<ListTree />}
                width="max-w-4xl"
                bodyClassName="p-0"
            >
                <PositionsTable positions={positions} report={report} canEdit={canEdit} />
            </Modal>
        );
    }

    // Only the people of this cell: others are moved in from their own cell or the card.
    const people = peopleIn(report, row, column);

    return (
        <Modal
            open
            onClose={onClose}
            title={`${row.name} · ${column.label}`}
            description={`Осіб: ${people.length}. Змініть статус у списку — людина перейде в іншу клітинку.`}
            icon={<Users />}
            width="max-w-4xl"
            bodyClassName="p-0"
        >
            <PeopleTable people={people} canEdit={canEdit} />
        </Modal>
    );
}
