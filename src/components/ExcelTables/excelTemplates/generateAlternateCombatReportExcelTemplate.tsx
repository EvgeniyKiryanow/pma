import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export async function generateAlternateCombatReportExcelTemplate() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Alternate Report', { properties: { defaultRowHeight: 100 } });

    const blackBorder = (style: ExcelJS.BorderStyle = 'thin'): Partial<ExcelJS.Border> => ({
        style,
        color: { argb: '000000' },
    });

    const styleHeader = (
        cell: ExcelJS.Cell,
        options: {
            backgroundColor?: string;
            bold?: boolean;
            borderRight?: boolean;
            borderLeft?: boolean;
            borderTop?: boolean;
            borderBottom?: boolean;
            rotate?: boolean;
            padding?: number;
        } = {},
    ) => {
        cell.font = { bold: options.bold ?? true, size: 10 };
        cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true,
            textRotation: options.rotate ? 90 : 0,
        };
        cell.border = {
            top: blackBorder(options.borderTop ? 'medium' : 'thin'),
            bottom: blackBorder(options.borderBottom ? 'medium' : 'thin'),
            left: blackBorder(options.borderLeft ? 'medium' : 'thin'),
            right: blackBorder(options.borderRight ? 'medium' : 'thin'),
        };
        if (options.backgroundColor) {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: options.backgroundColor.replace('#', '') },
            };
        }
    };

    // Header groups
    ws.mergeCells('A1:A2');
    ws.getCell('A1').value = '№';
    styleHeader(ws.getCell('A1'));

    // Set narrow width for column A (approx. 10–15px)
    ws.getColumn('A').width = 2.5;

    ws.mergeCells('B1:B2');
    ws.getCell('B1').value = 'Підрозділи';
    styleHeader(ws.getCell('B1'));

    // Set wider width for column B
    ws.getColumn('B').width = 10;

    ws.mergeCells('C1:E1');
    ws.getCell('C1').value = 'За штатом';
    styleHeader(ws.getCell('C1'));

    // Optional: reinforce centering (already applied by default)
    ws.getCell('C1').alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
    };

    // Increase row height for header row 1
    ws.getRow(1).height = 30;

    ws.mergeCells('C2');
    ws.getCell('C2').value = 'Всього за штатом';
    styleHeader(ws.getCell('C2'), { rotate: true });

    ws.mergeCells('D2');
    ws.getCell('D2').value = 'Офіцери';
    styleHeader(ws.getCell('D2'), { rotate: true });

    ws.mergeCells('E2');
    ws.getCell('E2').value = 'Сержанти/Солдати';
    styleHeader(ws.getCell('E2'), { rotate: true });

    // Row height for rotated text
    ws.getRow(2).height = 150;

    // Slightly wider columns
    ws.getColumn('C').width = 4;
    ws.getColumn('D').width = 4;
    ws.getColumn('E').width = 4;

    // Set row 2 height taller for rotated text
    ws.getRow(2).height = 150;

    ws.mergeCells('F1:F2');
    ws.getCell('F1').value = '% УКОПМЛЕКТОВАНІСТЬ';
    styleHeader(ws.getCell('F1'), { rotate: true });

    // Optional: adjust width and height for readability
    ws.getColumn('F').width = 4.5;
    ws.getRow(2).height = 150;

    ws.mergeCells('G1:I1');
    ws.getCell('G1').value = 'За списком';
    styleHeader(ws.getCell('G1'));

    // Subheaders with 90° rotation
    ws.mergeCells('G2');
    ws.getCell('G2').value = 'Всього за списком';
    styleHeader(ws.getCell('G2'), { rotate: true });

    ws.mergeCells('H2');
    ws.getCell('H2').value = 'Офіцери';
    styleHeader(ws.getCell('H2'), { rotate: true });

    ws.mergeCells('I2');
    ws.getCell('I2').value = 'Сержанти/Солдати';
    styleHeader(ws.getCell('I2'), { rotate: true });

    // Adjust row height and column widths
    ws.getRow(2).height = 150;
    ws.getColumn('G').width = 4;
    ws.getColumn('H').width = 4;
    ws.getColumn('I').width = 4;

    ws.mergeCells('J1:J2');
    ws.getCell('J1').value = '% В НАЯВНОСТІ';
    styleHeader(ws.getCell('J1'), { rotate: true });

    // Main header
    ws.mergeCells('K1:M1');
    ws.getCell('K1').value = 'В НАЯВНОСТІ';
    styleHeader(ws.getCell('K1'));

    // Subheaders with rotation and background color
    ws.mergeCells('K2');
    ws.getCell('K2').value = 'Всього за наявності';
    styleHeader(ws.getCell('K2'), { rotate: true, backgroundColor: '#f8da78' });

    ws.mergeCells('L2');
    ws.getCell('L2').value = 'Офіцери';
    styleHeader(ws.getCell('L2'), { rotate: true, backgroundColor: '#f8da78' });

    ws.mergeCells('M2');
    ws.getCell('M2').value = 'Сержанти/Солдати';
    styleHeader(ws.getCell('M2'), { rotate: true, backgroundColor: '#f8da78' });

    // Adjust row height and column widths
    ws.getRow(2).height = 150;
    ws.getColumn('K').width = 4;
    ws.getColumn('L').width = 4;
    ws.getColumn('M').width = 4;

    // === "З НИХ" group ===
    const znukhColumns = [
        { label: 'НА ПОЗИЦІЯ', bg: '#9fce63' },
        { label: 'БРОНЄГРУПА', bg: '#d7dce3' },
        { label: 'ПОЗИЦІЇ ПІХОТИ', bg: '#d7dce3' },
        { label: 'ПОЗИЦІЇ ЕКІПАЖ', bg: '#eab38a' },
        { label: 'ПОЗИЦІЇ РОЗРАХУНОК', bg: '#eab38a' },
        { label: 'ПОЗИЦІЇ БПЛА', bg: '#eab38a' },
        { label: 'РЕЗЕРВ ПІХОТИ', bg: '#eab38a' },
        { label: 'УПРАВЛІННЯ', bg: '#eab38a' },
        { label: 'БОЙОВЕ ЗАБЕСПЕЧЕННЯ', bg: '#eab38a' },
        { label: 'ЗАБЕСПЕЧЕННЯ', bg: '#eab38a' },
        { label: 'НОВОПРИБУЛІ НАВЧАННЯ В ПІДРОЗДІЛІ', bg: '#eab38a' },
        { label: 'Обмежено придатні', bg: '#f8da78' },
        { label: 'Хворі в підрозділі', bg: '#f8da78' },
        { label: 'Відмовники', bg: '#f8da78' },
        { label: 'Звільняються', bg: '#f8da78' },
        { label: 'Мають направлення на лік / обслід/ конс/ влк', bg: '#f8da78' },
    ];

    // === Helper to convert column number to Excel-style letter
    function getExcelColumnLetter(colIndex: number): string {
        let letter = '';
        while (colIndex > 0) {
            const mod = (colIndex - 1) % 26;
            letter = String.fromCharCode(65 + mod) + letter;
            colIndex = Math.floor((colIndex - 1) / 26);
        }
        return letter;
    }

    // === З НИХ Group Header (N to AC = 16 columns) ===
    ws.mergeCells('N1:AC1');
    ws.getCell('N1').value = 'З НИХ';
    styleHeader(ws.getCell('N1'));

    // === All 16 subheaders under З НИХ ===
    znukhColumns.forEach((col, idx) => {
        const colNumber = 14 + idx; // N = 14
        const colLetter = getExcelColumnLetter(colNumber);
        const cell = ws.getCell(`${colLetter}2`);
        cell.value = col.label;
        styleHeader(cell, {
            backgroundColor: col.bg,
            rotate: true,
        });
    });

    // Recommended: increase row height for rotated text (if not already set)
    ws.getRow(2).height = 150;

    // Optional: standardize width for clarity
    for (let i = 14; i <= 29; i++) {
        ws.getColumn(i).width = 3.5;
    }

    // === ВСЬОГО НЕ БГ === (next column = AD)
    ws.mergeCells('AD1:AD2');
    const totalCell = ws.getCell('AD1');
    totalCell.value = 'ВСЬОГО НЕ БГ';
    styleHeader(totalCell, {
        rotate: true,
        backgroundColor: '#b89230',
    });
    ws.getColumn('AD').width = 3.5;

    // === В ПІДРОЗДІЛІ === (next = AE)
    ws.mergeCells('AE1:AE2');
    const inUnitCell = ws.getCell('AE1');
    inUnitCell.value = 'В ПІДРОЗДІЛІ';
    styleHeader(inUnitCell, { rotate: true });
    ws.getColumn('AE').width = 3.5;

    // === ВІДСУТНІ group (10 columns: AF to AO) ===
    ws.mergeCells('AF1:AO1');
    const absentHeader = ws.getCell('AF1');
    absentHeader.value = 'ВІДСУТНІ';
    styleHeader(absentHeader);

    // Subheaders with background colors and rotation
    const absentSubheaders = [
        { label: 'ВЛК', bg: '#eab38a' },
        { label: 'Шпиталь/ЛІкарня', bg: '#eab38a' },
        { label: 'Мед.Рота', bg: '#eab38a' },
        { label: 'Відпустка (реабілітація)', bg: '#fcf2cf' },
        { label: 'Відпустка', bg: '#fcf2cf' },
        { label: 'Відрядження', bg: '#fcf2cf' },
        { label: 'СЗЧ', bg: '#fcf2cf' },
        { label: 'Поранені' },
        { label: 'Загиблі' },
        { label: 'Зниклі безвісті' },
    ];

    // Start from column 32 (AF)
    absentSubheaders.forEach((item, idx) => {
        const colLetter = getExcelColumnLetter(32 + idx);
        const cell = ws.getCell(`${colLetter}2`);
        cell.value = item.label;
        styleHeader(cell, {
            rotate: true,
            backgroundColor: item.bg,
        });
        ws.getColumn(colLetter).width = 3.5;
    });

    // Row height for rotated subheaders (if not set already)
    ws.getRow(2).height = 150;

    ws.mergeCells('AP1:AP2');
    const totalAbsentCell = ws.getCell('AP1');
    totalAbsentCell.value = 'ВСЬОГО ВІДСУТНІХ';
    styleHeader(totalAbsentCell, { rotate: true });

    // Optional: consistent width
    ws.getColumn('AP').width = 3.5;

    // BODY
    // Build column → header bg map
    const headerBgMap = new Map<string, string | undefined>();

    // Step through row 2 (subheaders)
    ws.getRow(2).eachCell((cell, colNumber) => {
        const colLetter = getExcelColumnLetter(colNumber);
        const fill = cell.fill as ExcelJS.FillPattern | undefined;
        const bg =
            fill && 'fgColor' in fill && fill.fgColor?.argb ? `#${fill.fgColor.argb}` : undefined;
        headerBgMap.set(colLetter, bg);
    });

    // Fallbacks for merged headers in row 1
    ['A', 'B', 'F', 'J', 'AD', 'AE', 'AP'].forEach((colLetter) => {
        if (!headerBgMap.has(colLetter)) {
            const fill = ws.getCell(`${colLetter}1`).fill as ExcelJS.FillPattern | undefined;
            const bg =
                fill && 'fgColor' in fill && fill.fgColor?.argb
                    ? `#${fill.fgColor.argb}`
                    : undefined;
            headerBgMap.set(colLetter, bg);
        }
    });

    // === Dynamic body rows definition
    const bodyRows = [
        { label: 'Управління роти', values: [] },
        { label: '1-й взвод', values: [] },
        { label: '2-й взвод', values: [] },
        { label: '3-й взвод', values: [] },
        { label: 'Всього прикомандировані', values: [] },
    ];

    // === Function to insert a body row
    function addStyledBodyRow(rowIndex: number, label: string, values: number[] = []) {
        // Column B label
        const labelCell = ws.getCell(`B${rowIndex}`);
        labelCell.value = label;
        styleHeader(labelCell, {
            backgroundColor: '#9fce63',
            bold: false,
        });

        // Fill values with matching bg color
        for (let col = 3; col <= ws.columnCount; col++) {
            const colLetter = getExcelColumnLetter(col);
            const cell = ws.getCell(`${colLetter}${rowIndex}`);
            cell.value = values[col - 3] ?? 0;
            styleHeader(cell, {
                backgroundColor: headerBgMap.get(colLetter),
                bold: false,
            });
        }
    }

    // === Add all body rows starting from row 3
    const startRow = 3;
    bodyRows.forEach((row, i) => {
        addStyledBodyRow(startRow + i, row.label, row.values);
    });

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(
        new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `alternate_template_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
}
