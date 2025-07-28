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

    ws.mergeCells('B1:B2');
    ws.getCell('B1').value = 'Підрозділи';
    styleHeader(ws.getCell('B1'));

    ws.mergeCells('C1:E1');
    ws.getCell('C1').value = 'За штатом';
    styleHeader(ws.getCell('B1'));

    ws.mergeCells('C2');
    ws.getCell('C2').value = 'Всього за штатом';
    ws.mergeCells('D2');
    ws.getCell('D2').value = 'Офіцери';
    ws.mergeCells('E2');
    ws.getCell('E2').value = 'Сержанти/Солдати';

    ws.mergeCells('F1:F2');
    ws.getCell('F1').value = '% УКОПМЛЕКТОВАНІСТЬ';
    styleHeader(ws.getCell('F1'));

    ws.mergeCells('G1:I1');
    ws.getCell('G1').value = 'За списком';
    styleHeader(ws.getCell('G1'));

    ws.mergeCells('G2');
    ws.getCell('G2').value = 'Всього за списком';
    ws.mergeCells('H2');
    ws.getCell('H2').value = 'Офіцери';
    ws.mergeCells('I2');
    ws.getCell('I2').value = 'Сержанти/Солдати';

    ws.mergeCells('J1:J2');
    ws.getCell('J1').value = '% В НАЯВНОСТІ';
    styleHeader(ws.getCell('J1'));

    ws.mergeCells('K1:M1');
    ws.getCell('K1').value = 'В НАЯВНОСТІ';
    styleHeader(ws.getCell('G1'));

    ws.mergeCells('K2');
    ws.getCell('K2').value = 'Всього за наявності';
    ws.mergeCells('L2');
    ws.getCell('L2').value = 'Офіцери';
    ws.mergeCells('M2');
    ws.getCell('M2').value = 'Сержанти/Солдати';
    // === "З НИХ" group ===
    const znukhColumns = [
        { label: 'НА ПОЗИЦІЯ', bg: '#f0ccb0' },
        { label: 'БРОНЄГРУПА', bg: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ ПІХОТИ', bg: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ ЕКІПАЖ', bg: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ РОЗРАХУНОК', bg: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ БПЛА', bg: '#f0ccb0' },
        { label: 'РЕЗЕРВ ПІХОТИ', bg: '#d8e9bc' },
        { label: 'УПРАВЛІННЯ', bg: '#d8e9bc' },
        { label: 'БОЙОВЕ ЗАБЕСПЕЧЕННЯ', bg: '#d8e9bc' },
        { label: 'ЗАБЕСПЕЧЕННЯ', bg: '#d8e9bc' },
        { label: 'НОВОПРИБУЛІ НАВЧАННЯ В ПІДРОЗДІЛІ', bg: '#d8e9bc' },
        { label: 'Обмежено придатні', bg: '#c2d6eb' },
        { label: 'Хворі в підрозділі', bg: '#c2d6eb' },
        { label: 'Відмовники', bg: '#c2d6eb' },
        { label: 'Звільняються', bg: '#c2d6eb' },
        { label: 'Мають направлення на лік / обслід/ конс/ влк' }, // <- this one will be moved
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
        });
    });

    // === ВСЬОГО НЕ БГ === (next column = AD)
    ws.mergeCells('AD1:AD2');
    const totalCell = ws.getCell('AD1');
    totalCell.value = 'ВСЬОГО НЕ БГ';
    styleHeader(totalCell);

    // === В ПІДРОЗДІЛІ === (next = AE)
    ws.mergeCells('AE1:AE2');
    const inUnitCell = ws.getCell('AE1');
    inUnitCell.value = 'В ПІДРОЗДІЛІ';
    styleHeader(inUnitCell);

    // === ВІДСУТНІ group (10 columns: AF to AO) ===
    ws.mergeCells('AF1:AO1');
    const absentHeader = ws.getCell('AF1');
    absentHeader.value = 'ВІДСУТНІ';
    styleHeader(absentHeader);

    const absentSubheaders = [
        'ВЛК',
        'Шпиталь/ЛІкарня',
        'Мед.Рота',
        'Відпустка (реабілітація)',
        'Відпустка',
        'Відрядження',
        'СЗЧ',
        'Поранені',
        'Загиблі',
        'Зниклі безвісті',
    ];

    // Start from column 32 (AF)
    absentSubheaders.forEach((label, idx) => {
        const colLetter = getExcelColumnLetter(32 + idx);
        const cell = ws.getCell(`${colLetter}2`);
        cell.value = label;
        styleHeader(cell);
    });

    // === ВСЬОГО ВІДСУТНІХ === (next = AP)
    ws.mergeCells('AP1:AP2');
    const totalAbsentCell = ws.getCell('AP1');
    totalAbsentCell.value = 'ВСЬОГО ВІДСУТНІХ';
    styleHeader(totalAbsentCell);

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(
        new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `alternate_template_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
}
