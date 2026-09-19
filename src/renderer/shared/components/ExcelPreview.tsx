import type ExcelJS from 'exceljs';
import { FileSpreadsheet } from 'lucide-react';
import { type CSSProperties, useMemo, useState } from 'react';

import { useI18nStore } from '../../stores/i18nStore';
import { cn } from '../ui';

/**
 * A workbook shown the way Excel shows it: sheet tabs, column letters, row numbers, merged
 * cells, fills, bold headings and column widths. Built from the same ExcelJS workbook that is
 * saved, so what is on the screen is what goes into the file.
 */

type PreviewCell = { text: string; colSpan: number; rowSpan: number; style: CSSProperties };

type PreviewRow = { number: number; height?: number; cells: (PreviewCell | null)[] };

type PreviewSheet = {
    name: string;
    widths: number[];
    frozenRows: number;
    rows: PreviewRow[];
    totalRows: number;
};

/** Excel column width (characters) → pixels, roughly as Excel draws Calibri 11. */
const px = (width: number | undefined) => Math.round((width ?? 8.43) * 7 + 5);

export function columnLetter(index: number): string {
    let n = index;
    let letters = '';
    while (n > 0) {
        const rest = (n - 1) % 26;
        letters = String.fromCharCode(65 + rest) + letters;
        n = Math.floor((n - 1) / 26);
    }
    return letters;
}

/** "B2:D3" → rows/cols (1-based). */
export function parseRange(range: string) {
    const cell = (ref: string) => {
        const match = /^([A-Z]+)(\d+)$/.exec(ref.replace(/\$/g, ''));
        if (!match) return null;
        const col = [...match[1]].reduce((sum, ch) => sum * 26 + ch.charCodeAt(0) - 64, 0);
        return { row: Number(match[2]), col };
    };
    const [from, to] = range.split(':').map(cell);
    if (!from) return null;
    return {
        top: from.row,
        left: from.col,
        bottom: to?.row ?? from.row,
        right: to?.col ?? from.col,
    };
}

const two = (n: number) => String(n).padStart(2, '0');

function cellText(cell: ExcelJS.Cell): string {
    const value = cell.value;
    if (value === null || value === undefined) return '';
    if (value instanceof Date) {
        // Dates of the cards are UTC midnights.
        return `${two(value.getUTCDate())}.${two(value.getUTCMonth() + 1)}.${value.getUTCFullYear()}`;
    }
    if (typeof value === 'object') {
        if ('richText' in value) return value.richText.map((part) => part.text).join('');
        if ('result' in value) return String(value.result ?? '');
        if ('text' in value) return String(value.text ?? '');
    }
    return String(value);
}

const argb = (color: Partial<ExcelJS.Color> | undefined) =>
    color?.argb && color.argb.length === 8 ? `#${color.argb.slice(2)}` : undefined;

function cellStyle(cell: ExcelJS.Cell): CSSProperties {
    const style: CSSProperties = {};
    const fill = cell.fill as ExcelJS.FillPattern | undefined;
    if (fill?.type === 'pattern' && fill.pattern === 'solid') {
        style.background = argb(fill.fgColor);
    }
    if (cell.font?.bold) style.fontWeight = 600;
    if (cell.font?.italic) style.fontStyle = 'italic';
    const color = argb(cell.font?.color);
    if (color) style.color = color;
    const align = cell.alignment;
    if (align?.horizontal === 'center' || align?.horizontal === 'right') {
        style.textAlign = align.horizontal;
    }
    style.verticalAlign =
        align?.vertical === 'middle' ? 'middle' : align?.vertical === 'bottom' ? 'bottom' : 'top';
    style.whiteSpace = align?.wrapText ? 'normal' : 'nowrap';
    return style;
}

function readSheet(ws: ExcelJS.Worksheet, maxRows: number): PreviewSheet {
    const columnCount = ws.columnCount;
    const widths = Array.from({ length: columnCount }, (_, i) => px(ws.getColumn(i + 1).width));
    const merges = ((ws.model as { merges?: string[] }).merges ?? [])
        .map(parseRange)
        .filter(Boolean) as NonNullable<ReturnType<typeof parseRange>>[];
    const covered = new Set<string>();
    const spans = new Map<string, { rowSpan: number; colSpan: number }>();
    for (const m of merges) {
        spans.set(`${m.top}:${m.left}`, {
            rowSpan: m.bottom - m.top + 1,
            colSpan: m.right - m.left + 1,
        });
        for (let r = m.top; r <= m.bottom; r++)
            for (let c = m.left; c <= m.right; c++)
                if (r !== m.top || c !== m.left) covered.add(`${r}:${c}`);
    }

    const totalRows = ws.rowCount;
    const rows: PreviewRow[] = [];
    for (let r = 1; r <= Math.min(totalRows, maxRows); r++) {
        const row = ws.getRow(r);
        const cells: (PreviewCell | null)[] = [];
        for (let c = 1; c <= columnCount; c++) {
            if (covered.has(`${r}:${c}`)) {
                cells.push(null);
                continue;
            }
            const cell = row.getCell(c);
            const span = spans.get(`${r}:${c}`);
            cells.push({
                text: cellText(cell),
                rowSpan: span?.rowSpan ?? 1,
                colSpan: span?.colSpan ?? 1,
                style: cellStyle(cell),
            });
        }
        rows.push({
            number: r,
            height: row.height ? Math.round(row.height * 1.33) : undefined,
            cells,
        });
    }
    const view = ws.views?.[0] as { ySplit?: number } | undefined;
    return {
        name: ws.name,
        widths,
        frozenRows: Math.min(view?.ySplit ?? 0, rows.length),
        rows,
        totalRows,
    };
}

export default function ExcelPreview({
    workbook,
    maxRows = 200,
    className,
}: {
    workbook: ExcelJS.Workbook;
    /** Rows drawn per sheet; the rest are counted below the table (the file has all of them). */
    maxRows?: number;
    className?: string;
}) {
    const sheets = useMemo(
        () => workbook.worksheets.map((ws) => readSheet(ws, maxRows)),
        [workbook, maxRows],
    );
    const { t } = useI18nStore();
    const [active, setActive] = useState(0);
    const sheet = sheets[Math.min(active, sheets.length - 1)];
    if (!sheet) return null;

    const header = sheet.rows.slice(0, sheet.frozenRows);
    const body = sheet.rows.slice(sheet.frozenRows);
    const cellClass = 'border border-[#d4d4d4] px-1.5 py-0.5 align-top';

    const renderRow = (row: PreviewRow) => (
        <tr key={row.number} style={{ height: row.height }}>
            <th className="sticky left-0 z-[1] border border-[#d4d4d4] bg-[#f3f3f3] px-1.5 text-right font-normal text-[#666]">
                {row.number}
            </th>
            {row.cells.map((cell, c) =>
                cell ? (
                    <td
                        key={c}
                        colSpan={cell.colSpan}
                        rowSpan={cell.rowSpan}
                        className={cellClass}
                        style={cell.style}
                    >
                        {cell.text}
                    </td>
                ) : null,
            )}
        </tr>
    );

    return (
        <div
            className={cn(
                'flex min-h-0 flex-col overflow-hidden rounded-xl border border-line',
                className,
            )}
        >
            {/* White paper with black text in both themes, as Excel shows the file. */}
            <div className="paper min-h-0 flex-1 overflow-auto bg-white [color-scheme:light]">
                <table
                    className="border-collapse text-[12px] leading-snug text-[#111]"
                    style={{ fontFamily: "'Times New Roman', serif", tableLayout: 'fixed' }}
                >
                    <colgroup>
                        <col style={{ width: 44 }} />
                        {sheet.widths.map((width, i) => (
                            <col key={i} style={{ width }} />
                        ))}
                    </colgroup>
                    <thead className="sticky top-0 z-[2] bg-white shadow-[0_1px_0_#bdbdbd]">
                        <tr>
                            <th className="sticky left-0 z-[1] border border-[#d4d4d4] bg-[#e9e9e9]" />
                            {sheet.widths.map((_, i) => (
                                <th
                                    key={i}
                                    className="border border-[#d4d4d4] bg-[#f3f3f3] py-0.5 text-center font-sans text-[11px] font-normal text-[#666]"
                                >
                                    {columnLetter(i + 1)}
                                </th>
                            ))}
                        </tr>
                        {header.map(renderRow)}
                    </thead>
                    <tbody>{body.map(renderRow)}</tbody>
                </table>
                {sheet.totalRows > sheet.rows.length && (
                    <p className="px-3 py-2 font-sans text-xs text-[#666]">
                        {t('excelPreview.more', {
                            shown: sheet.rows.length,
                            total: sheet.totalRows,
                        })}
                    </p>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-t border-line bg-surface-2 px-2 py-1">
                <FileSpreadsheet className="mr-1 size-4 shrink-0 text-ink-3" />
                {sheets.map((s, i) => (
                    <button
                        key={s.name}
                        type="button"
                        onClick={() => setActive(i)}
                        className={cn(
                            'shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                            i === active
                                ? 'bg-surface text-primary-ink shadow-card'
                                : 'text-ink-3 hover:text-ink',
                        )}
                    >
                        {s.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
