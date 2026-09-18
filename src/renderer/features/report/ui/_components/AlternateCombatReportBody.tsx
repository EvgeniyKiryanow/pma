import type { CSSProperties } from 'react';

import { type AlternateReport, REPORT_COLUMNS, type ReportRow } from '../../model/alternateReport';
import type { ReportCellTarget } from './ReportCellModal';

const THICK = '2px';

function nameFill(row: ReportRow): string {
    if (row.kind === 'total') return '#d3d3d3';
    if (row.kind === 'attached') return '#f7f7f7';
    return '#92fc7a';
}

/**
 * Rows of the form: one per subunit of the БЧС, then ВСЬОГО and the attached. Every number is
 * a button — it opens who is behind it (see ReportCellModal). Percentages are computed.
 */
export function AlternateCombatReportBody({
    report,
    onOpenCell,
}: {
    report: AlternateReport;
    onOpenCell: (target: ReportCellTarget) => void;
}) {
    return (
        <tbody>
            {report.rows.map((row, index) => (
                <tr key={row.name} className="border-t">
                    <td
                        style={{
                            borderRightWidth: THICK,
                            backgroundColor: row.kind === 'unit' ? undefined : '#f0f0f0',
                        }}
                        className="border border-black text-center"
                    >
                        {index + 1}
                    </td>
                    <td
                        style={{
                            borderWidth: THICK,
                            fontWeight: 'bold',
                            backgroundColor: nameFill(row),
                        }}
                        className="whitespace-nowrap border border-black px-2 text-left"
                    >
                        {row.name}
                    </td>
                    {REPORT_COLUMNS.map((column, columnIndex) => {
                        const style: CSSProperties = {
                            backgroundColor: column.fill,
                            borderRightWidth: column.groupEnd ? THICK : undefined,
                        };
                        const value = row.values[column.field];
                        if (column.kind === 'percent') {
                            return (
                                <td
                                    key={columnIndex}
                                    style={style}
                                    className="border border-black px-1 tabular-nums"
                                    title="Рахується автоматично"
                                >
                                    {value}
                                </td>
                            );
                        }
                        return (
                            <td key={columnIndex} style={style} className="border border-black p-0">
                                <button
                                    type="button"
                                    onClick={() =>
                                        onOpenCell({ row: row.name, column: columnIndex })
                                    }
                                    title={`${row.name} · ${column.label}: хто тут?`}
                                    className="block h-full min-h-6 w-full cursor-pointer px-1 tabular-nums hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1d4ed8]"
                                >
                                    {value}
                                </button>
                            </td>
                        );
                    })}
                </tr>
            ))}
        </tbody>
    );
}
