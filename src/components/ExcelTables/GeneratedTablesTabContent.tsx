import React from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { CombatReportTable } from './_components/CombatReportTable';
type BorderStyle =
    | 'thin'
    | 'dotted'
    | 'dashDot'
    | 'hair'
    | 'medium'
    | 'double'
    | 'thick'
    | 'dashDotDot'
    | 'slantDashDot'
    | 'mediumDashed'
    | 'mediumDashDot'
    | 'mediumDashDotDot';

// ✅ STYLE UTILITY → preserves thick 3px React borders as "medium"
const THICK_BORDER = { style: 'medium' as BorderStyle, color: { argb: '000000' } };
const THIN_BORDER = { style: 'thin' as BorderStyle, color: { argb: '000000' } };

const styleCell = (
    cell: ExcelJS.Cell,
    cfg: {
        backgroundColor?: string;
        bold?: boolean;
        leftBorder?: boolean;
        rightBorder?: boolean;
        topBorder?: boolean;
        bottomBorder?: boolean;
    } = {},
) => {
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.font = { bold: cfg.bold ?? false, size: 10 };

    cell.border = {
        top: cfg.topBorder ? THICK_BORDER : THIN_BORDER,
        bottom: cfg.bottomBorder ? THICK_BORDER : THIN_BORDER,
        left: cfg.leftBorder ? THICK_BORDER : THIN_BORDER,
        right: cfg.rightBorder ? THICK_BORDER : THIN_BORDER,
    };

    if (cfg.backgroundColor) {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: cfg.backgroundColor.replace('#', '') },
        };
    }
};

// ✅ EXPORT LOGIC
const exportCombatReportToExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Combat Report', {
        properties: { defaultRowHeight: 35 }, // height like your React table
    });

    // === TOP TITLE ROWS ===
    ws.mergeCells('A1:AW1');
    ws.getCell('A1').value = 'ДОНЕСЕННЯ';
    styleCell(ws.getCell('A1'), { bold: true });

    ws.mergeCells('A2:AW2');
    ws.getCell('A2').value = 'Про бойовий та чисельний склад 1МБ 151 ОМБр на 7/25/25';
    styleCell(ws.getCell('A2'), { bold: true });

    // === MAIN HEADER GROUP ROW (Row 3) ===

    // №
    ws.mergeCells('A3:A4');
    ws.getCell('A3').value = '№';
    styleCell(ws.getCell('A3'));

    // ПІДРОЗДІЛИ
    ws.mergeCells('B3:B4');
    ws.getCell('B3').value = 'ПІДРОЗДІЛИ';
    styleCell(ws.getCell('B3'), {
        backgroundColor: '#f0f0f0',
        leftBorder: true,
        topBorder: true,
        bold: true,
    });

    // ЗА ШТАТОМ (C3:E3)
    ws.mergeCells('C3:E3');
    ws.getCell('C3').value = 'ЗА ШТАТОМ';
    styleCell(ws.getCell('C3'), {
        backgroundColor: '#f0f0f0',
        topBorder: true,
        bold: true,
    });
    ws.getCell('C4').value = 'ВСЬОГО ЗА ШТАТОМ';
    ws.getCell('D4').value = 'ОФІЦЕРИ';
    ws.getCell('E4').value = 'СЕРЖАНТИ/СОЛДАТИ';
    ['C4', 'D4', 'E4'].forEach((addr) =>
        styleCell(ws.getCell(addr), { backgroundColor: '#f0f0f0' }),
    );
    styleCell(ws.getCell('E4'), {
        rightBorder: true,
    });

    // ЗА СПИСКОМ (F3:I3)
    ws.mergeCells('F3:I3');
    ws.getCell('F3').value = 'ЗА СПИСКОМ';
    styleCell(ws.getCell('F3'), {
        backgroundColor: '#f0f0f0',
        leftBorder: true,
        rightBorder: true,
        topBorder: true,
        bold: true,
    });
    ws.getCell('F4').value = '% УКОМПЛЕКТОВАННОСТІ';
    styleCell(ws.getCell('F4'), {
        leftBorder: true,
    });
    ws.getCell('G4').value = 'ВСЬОГО ЗА СПИСКОМ';
    ws.getCell('H4').value = 'ОФІЦЕРИ';
    ws.getCell('I4').value = 'СЕРЖАНТИ/СОЛДАТИ';
    ['F4', 'G4', 'H4', 'I4'].forEach((addr) =>
        styleCell(ws.getCell(addr), { backgroundColor: '#f0f0f0' }),
    );

    // % В НАЯВНОСТІ (J3:J4)
    ws.mergeCells('J3:J4');
    ws.getCell('J3').value = '% В НАЯВНОСТІ';
    styleCell(ws.getCell('J3'), {
        backgroundColor: '#f0f0f0',
        leftBorder: true,
        topBorder: true,
        bold: true,
    });

    // В НАЯВНОСТІ ВСЬОГО (K3:K4)
    ws.mergeCells('K3:K4');
    ws.getCell('K3').value = 'В НАЯВНОСТІ ВСЬОГО';
    styleCell(ws.getCell('K3'), {
        backgroundColor: '#f8da78',
        topBorder: true,
        leftBorder: true,
        rightBorder: true,
        bold: true,
    });

    // ОФІЦЕРИ (L3:L4)
    ws.mergeCells('L3:L4');
    ws.getCell('L3').value = 'ОФІЦЕРИ';
    styleCell(ws.getCell('L3'), {
        topBorder: true,
    });

    // СЕРЖАНТИ СОЛДАТИ (M3:M4)
    ws.mergeCells('M3:M4');
    ws.getCell('M3').value = 'СЕРЖАНТИ СОЛДАТИ';
    styleCell(ws.getCell('M3'), { rightBorder: true, topBorder: true });

    // === z наявних в районі ВБД ===
    ws.mergeCells('N3:AH3');
    ws.getCell('N3').value = 'з наявних в районі ВБД:';
    styleCell(ws.getCell('N3'), {
        backgroundColor: '#f8da78',
        bold: true,
        topBorder: true,
    });

    // these 25 sub-columns have **different groups** => color separately
    const positionCols = [
        { label: 'На позиціях, всього', bg: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ ПІХОТИ', bg: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ ЕКІПАЖ', bg: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ РОЗРАХУНОК', bg: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ БПЛА', bg: '#f0ccb0' },
        { label: 'РОТАЦІЯ ТА РЕЗЕРВ, всього', bg: '#d8e9bc' },
        { label: 'РОТАЦІЯ ПІХОТА', bg: '#d8e9bc' },
        { label: 'РОТАЦІЯ ЕКІПАЖ', bg: '#d8e9bc' },
        { label: 'РОТАЦІЯ РОЗРАХУНОК', bg: '#d8e9bc' },
        { label: 'РОТАЦІЯ БПЛА', bg: '#d8e9bc' },
        { label: 'ЗАБЕСПЕЧЕННЯ, всього', bg: '#c2d6eb' },
        { label: 'ЗАБЕСПЕЧЕННЯ, БД', bg: '#c2d6eb' },
        { label: 'ЗАБЕСПЕЧЕННЯ, ІНЖЕНЕРНЕ', bg: '#c2d6eb' },
        { label: 'ЗАБЕСПЕЧЕННЯ, ЖИТТЄДІЯЛЬНОСТІ', bg: '#c2d6eb' },
        { label: 'УПРАВЛІННЯ' },
        { label: 'КСП', rightBorder: true, bold: true },
        { label: 'не БГ всього:', bg: '#fcf2d0', bold: true },
        { label: 'придані в інші підрозділи', bg: '#fcf2d0', bold: true },
        { label: 'навчання,новоприбувші', bg: '#fcf2d0', bold: true },
        { label: 'мають направлення на лік.', bg: '#fcf2d0', bold: true },
        { label: 'звільнено від фізичного навантаження', bg: '#fcf2d0', bold: true },
        { label: 'лікування на локації', bg: '#fcf2d0', bold: true },
        { label: 'обмежено придатні', bg: '#fcf2d0', bold: true },
        { label: 'очікують кадрового рішення', bg: '#fcf2d0', bold: true },
        { label: 'відмовники', bg: '#fcf2d0', bold: true },
    ];

    let colIndex = 14; // N=14
    positionCols.forEach((col) => {
        const c = ws.getCell(4, colIndex);
        c.value = col.label;
        styleCell(c, {
            backgroundColor: col.bg,
            topBorder: true,
            bold: col.bold,
            rightBorder: col.rightBorder,
        });
        colIndex++;
    });

    // ПІДПОРЯДКУВАННЯ ІНШІЙ В/Ч
    ws.mergeCells('AI3:AI4');
    ws.getCell('AI3').value = 'ПІДПОРЯДКУВАННЯ ІНШІЙ В/Ч';
    styleCell(ws.getCell('AI3'), { backgroundColor: '#c2d6eb', leftBorder: true, topBorder: true });

    // ППД НЕ В РАЙОНІ
    ws.mergeCells('AJ3:AJ4');
    ws.getCell('AJ3').value = 'ППД НЕ В РАЙОНІ';
    styleCell(ws.getCell('AJ3'), {
        backgroundColor: '#d8e9bc',
        rightBorder: true,
        topBorder: true,
    });

    // ВІДСУТНІСТЬ ВСЬОГО
    ws.mergeCells('AK3:AK4');
    ws.getCell('AK3').value = 'ВІДСУТНІСТЬ ВСЬОГО:';
    styleCell(ws.getCell('AK3'), {
        backgroundColor: '#f0ccb0',
        topBorder: true,
        rightBorder: true,
    });

    // причини відсутності AL3:AW3
    ws.mergeCells('AL3:AW3');
    ws.getCell('AL3').value = 'причини відсутності:';
    styleCell(ws.getCell('AL3'), {
        backgroundColor: '#f0ccb0',
        rightBorder: true,
        topBorder: true,
        bottomBorder: true,
    });

    const reasonCols = [
        { label: 'ВІДПУСТКА ЛІКУВАННЯ', bg: '#fcf2d0' },
        { label: 'ВІДПУСТКА ЩОРІЧНА', bg: '#fcf2d0' },
        { label: 'ВІДПУСТКА СІМЕЙНІ', bg: '#fcf2d0' },
        { label: 'НАВЧАННЯ', bg: '#fcf2d0' },
        { label: 'ВІДРЯДЖЕННЯ', bg: '#fcf2d0' },
        { label: 'АРЕШТ', bg: '#f0ccb0' },
        { label: 'СЗЧ', bg: '#f0ccb0' },
        { label: 'ШПИТАЛЬ', bg: '#f0ccb0' },
        { label: 'ВЛК', bg: '#f6cd9f' },
        { label: '300', bg: '#f0ccb0' },
        { label: '500', bg: '#f0ccb0' },
        { label: '200', bg: '#f0ccb0', rightBorder: true },
    ];
    colIndex = 38; // AL=38
    reasonCols.forEach((col) => {
        const c = ws.getCell(4, colIndex);
        c.value = col.label;
        styleCell(c, {
            backgroundColor: col.bg,
            rightBorder: col.rightBorder,
        });
        colIndex++;
    });

    // === BODY ROW SAMPLE ===
    const body = ws.addRow([
        '1',
        '1 РОТА',
        '20',
        '5',
        '15',
        '90%',
        '18',
        '4',
        '14',
        '88%',
        '85%',
        '17',
        '4',
        '13',
        '2',
        '1',
        '0',
        '3',
        '1',
        '2',
        '1',
        '2',
        '0',
        '1',
        '2',
        '1',
        '0',
        '3',
        '1',
        '0',
        '1',
        '1',
        '0',
        '0',
        '1',
        '0',
        '0',
        '0',
        '0',
        '1',
        '0',
        '0',
        '1',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
    ]);
    body.eachCell((c) => {
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        c.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        };
    });

    // Column widths ~ 50px
    // Column widths ~ 50px
    ws.columns.forEach((c) => (c.width = 4));

    // ✅ Specific wider columns
    const widerColumns: Record<string, number> = {
        B: 12, // ПІДРОЗДІЛИ
        J: 12, // % В НАЯВНОСТІ
        K: 12, // В НАЯВНОСТІ ВСЬОГО
        L: 12, // ОФІЦЕРИ
        M: 12, // СЕРЖАНТИ СОЛДАТИ
        AI: 12, // ПІДПОРЯДКУВАННЯ ІНШІЙ В/Ч
        AJ: 12, // ППД НЕ В РАЙОНІ
        AK: 12, // ВІДСУТНІСТЬ ВСЬОГО
    };
    ws.getRow(4).height = 140;
    ws.getRow(4).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };

    // Helper: convert Excel column letters → number index
    const colLetterToIndex = (letter: string): number =>
        letter.split('').reduce((res, ch) => res * 26 + ch.charCodeAt(0) - 64, 0);

    // Apply custom widths
    Object.entries(widerColumns).forEach(([colLetter, width]) => {
        ws.getColumn(colLetterToIndex(colLetter)).width = width;
    });

    // ✅ Generate and save file
    const buf = await wb.xlsx.writeBuffer();
    saveAs(
        new Blob([buf], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        'combat_report.xlsx',
    );
};

export default function GeneratedTablesTabContent() {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">📑 Згенеровані таблиці</h1>
            <button
                onClick={exportCombatReportToExcel}
                className="mb-4 px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700"
            >
                📤 Export Combat Report (.xlsx)
            </button>
            <div className="overflow-x-auto rounded-lg">
                <table className="min-w-full text-center text-sm border-collapse border border-black">
                    <CombatReportTable />
                </table>
            </div>
        </div>
    );
}
