import {
    ClipboardList,
    FileDown,
    FileText,
    ListTree,
    Lock,
    MousePointerClick,
    Printer,
    Swords,
    UserRoundX,
    UsersRound,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { useShtatniStore } from '../../../entities/shtatna-posada/model/useShtatniStore';
import { printReport } from '../../../shared/lib/printReport';
import { Button, cn, EmptyState } from '../../../shared/ui';
import { useUserStore } from '../../../stores/userStore';
import { exportNamedListTable } from '../excel/exportNamedListTable';
import { generateAlternateCombatReportExcelTemplate } from '../excel/generateAlternateCombatReportExcelTemplate';
import { generateStaffReportExcel } from '../excel/generateStaffReportExcel';
import { buildAlternateReport } from '../model/alternateReport';
import { AlternateCombatReportTable } from './_components/AlternateCombatReportTable';
import { NamedListTable } from './_components/NamedListTable';
import { ReportCellModal, type ReportCellTarget } from './_components/ReportCellModal';
import { StaffReportTable } from './_components/StaffReportTable';

type Props = {
    onRequestImportTab?: () => void;
};

type TableId = 'staff' | 'alternate' | 'named';

const TABLES: { id: TableId; title: string; description: string; icon: ReactNode }[] = [
    {
        id: 'named',
        title: 'Іменний список',
        description: 'Табель вечірньої повірки за місяць',
        icon: <UsersRound />,
    },
    {
        id: 'alternate',
        title: 'Альтернативний звіт',
        description: 'Бойове донесення за підрозділами',
        icon: <Swords />,
    },
    {
        id: 'staff',
        title: 'Штатний звіт',
        description: 'Посади, люди та статуси в районі',
        icon: <ClipboardList />,
    },
];

export default function GeneratedTablesTabContent({ onRequestImportTab }: Props) {
    const [activeTable, setActiveTable] = useState<TableId>('named');
    const { shtatniPosady } = useShtatniStore();
    const hasShtatni = shtatniPosady.length > 0;
    const { fetchAll } = useShtatniStore();
    const { fetchUsers } = useUserStore();

    useEffect(() => {
        void fetchAll();
        void fetchUsers();
    }, []);

    const users = useUserStore((s) => s.users);
    // Recounted on every change of a person or a position (also the ones made from the report).
    const report = useMemo(
        () => buildAlternateReport(users, shtatniPosady),
        [users, shtatniPosady],
    );
    const [cell, setCell] = useState<ReportCellTarget | null>(null);
    // What is printed: the table on the screen, exactly as it is.
    const printArea = useRef<HTMLDivElement>(null);
    const printTitle = () =>
        `${TABLES.find((table) => table.id === activeTable)?.title ?? ''} — станом на ${new Date().toLocaleDateString('uk-UA')}`;
    const printActive = (mode: 'print' | 'pdf') => {
        if (printArea.current) void printReport(printArea.current, printTitle(), mode);
    };
    const active = TABLES.find((table) => table.id === activeTable) ?? TABLES[0];

    const exportActive = () => {
        if (activeTable === 'named') void exportNamedListTable();
        else if (activeTable === 'alternate')
            void generateAlternateCombatReportExcelTemplate(report);
        else void generateStaffReportExcel();
    };

    return (
        <div className="flex min-h-0 flex-1">
            <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-surface">
                <p className="eyebrow px-4 pb-2 pt-4">Таблиці</p>
                <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
                    {TABLES.map((table) => {
                        const isActive = activeTable === table.id;
                        const disabled = !hasShtatni;
                        return (
                            <button
                                key={table.id}
                                onClick={() => !disabled && setActiveTable(table.id)}
                                disabled={disabled}
                                title={
                                    disabled
                                        ? 'Щоб увімкнути звіти, спочатку імпортуйте або додайте БЧС'
                                        : undefined
                                }
                                className={cn(
                                    'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                                    disabled && 'cursor-not-allowed opacity-50',
                                    !disabled && isActive && 'bg-primary-soft',
                                    !disabled && !isActive && 'hover:bg-surface-2',
                                )}
                            >
                                <span
                                    className={cn(
                                        'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4',
                                        isActive && !disabled
                                            ? 'bg-primary text-on-primary'
                                            : 'bg-surface-2 text-ink-3',
                                    )}
                                >
                                    {disabled ? <Lock /> : table.icon}
                                </span>
                                <span className="min-w-0">
                                    <span
                                        className={cn(
                                            'block text-[13px] font-semibold',
                                            isActive && !disabled ? 'text-primary-ink' : 'text-ink',
                                        )}
                                    >
                                        {table.title}
                                    </span>
                                    <span className="block text-xs leading-snug text-ink-3">
                                        {table.description}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
                {!hasShtatni ? (
                    <div className="flex flex-1 items-center justify-center p-8">
                        <EmptyState
                            icon={<ListTree />}
                            title="Потрібен БЧС"
                            description="Щоб сформувати донесення, штатний звіт чи іменний список, спочатку імпортуйте або додайте штатні посади. Після цього таблиці зʼявляться автоматично."
                            action={
                                onRequestImportTab && (
                                    <Button onClick={onRequestImportTab}>
                                        Імпортувати посади з Excel
                                    </Button>
                                )
                            }
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3">
                            <div className="min-w-0">
                                <h2 className="truncate text-[15px] font-semibold text-ink">
                                    {active.title}
                                </h2>
                                <p className="text-xs text-ink-3">
                                    Дані станом на {new Date().toLocaleDateString('uk-UA')}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={<Printer className="size-4" />}
                                    onClick={() => printActive('print')}
                                >
                                    Друк
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={<FileText className="size-4" />}
                                    onClick={() => printActive('pdf')}
                                >
                                    Зберегти PDF
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={<FileDown className="size-4" />}
                                    onClick={exportActive}
                                >
                                    Експорт у Excel
                                </Button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-auto p-5">
                            <div ref={printArea} className="w-max min-w-full">
                                {activeTable === 'named' && <NamedListTable />}

                                {activeTable === 'alternate' && (
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-2">
                                            <span className="flex items-center gap-1.5">
                                                <MousePointerClick className="size-4 text-ink-3" />
                                                Натисніть на число — побачите, хто саме там, і
                                                зможете змінити статус або посаду.
                                            </span>
                                            {report.withoutStatus.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCell('without-status')}
                                                    className="flex items-center gap-1.5 rounded-lg bg-warning-soft px-2.5 py-1 font-medium text-warning-ink hover:underline"
                                                >
                                                    <UserRoundX className="size-4" />
                                                    Без статусу: {report.withoutStatus.length} — їх
                                                    немає ні в «В наявності», ні у «Відсутні»
                                                </button>
                                            )}
                                        </div>
                                        <div className="paper overflow-x-auto p-4">
                                            <table className="min-w-full border-collapse text-center text-sm">
                                                <AlternateCombatReportTable
                                                    report={report}
                                                    onOpenCell={setCell}
                                                />
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeTable === 'staff' && <StaffReportTable />}
                            </div>
                        </div>
                    </>
                )}
            </main>
            {cell && (
                <ReportCellModal report={report} target={cell} onClose={() => setCell(null)} />
            )}
        </div>
    );
}
