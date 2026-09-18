import ExcelJS from 'exceljs';

import type { User } from '../../../../shared/types/user';
import { downloadFile } from '../../../shared/lib/download';
import {
    IMPULSE_COLUMNS,
    IMPULSE_EDUCATION_COLUMNS,
    IMPULSE_INFO_COLUMNS,
    type ImpulseColumn,
    impulseEducationRow,
    impulsePeople,
    impulseRow,
    type ImpulseValue,
} from '../model/impulseExport';

const FONT = { name: 'Times New Roman', size: 11 } as const;
const THIN = { style: 'thin' } as const;
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const INFO_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEDEDED' },
};

const NOTES = [
    [
        'Звідки дані',
        'Файл сформовано програмою PManager з карток особового складу (без виключених). Форма — «Додаток 1» і «Додаток 2» шаблону Імпульс Toolkit.',
    ],
    [
        'Що заповнено',
        'Колонку заповнено лише тоді, коли значення розпізнано напевно: дата, серія і номер документа, значення з довідника Імпульсу (звання, стать, група крові, сімейний стан, придатність, вид служби). Решта клітинок порожні — Імпульс не змінить ці поля в картці.',
    ],
    [
        'Інформаційні колонки',
        'Праворуч від форми (сірий заголовок) — те, що записано в PManager, як є. Імпульс їх ігнорує під час імпорту. Звідти зручно доповнити порожні клітинки форми вручну.',
    ],
    [
        'Перед імпортом',
        'Перегляньте файл. Прізвище та імʼя обовʼязкові й використовуються для пошуку картки. У «Освіта і курси» заповнено те, що вдалося розпізнати; «Навчальний заклад» і «Тип навчального закладу» заповніть самі — без них рядок не імпортується.',
    ],
];

function headerCell(cell: ExcelJS.Cell, value: string | number, info = false): void {
    cell.value = value;
    cell.font = { ...FONT, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = BORDER;
    if (info) cell.fill = INFO_FILL;
}

function dataCell(cell: ExcelJS.Cell, value: ImpulseValue, column: ImpulseColumn): void {
    if (column.kind === 'date') cell.numFmt = 'dd.mm.yyyy;@';
    else if (column.kind === 'text') cell.numFmt = '@';
    cell.value = value;
    cell.font = FONT;
    cell.alignment = { vertical: 'top', wrapText: true };
    cell.border = BORDER;
}

/** Row 2: one merged heading over each run of columns of the same group. */
function groupRow(ws: ExcelJS.Worksheet, columns: ImpulseColumn[], infoFrom: number): void {
    let start = 0;
    for (let i = 1; i <= columns.length; i++) {
        if (i < columns.length && columns[i].group === columns[start].group) continue;
        const from = start + 1;
        const to = i;
        if (to > from) ws.mergeCells(2, from, 2, to);
        for (let c = from; c <= to; c++)
            headerCell(ws.getCell(2, c), columns[start].group, c >= infoFrom);
        start = i;
    }
}

function personnelSheet(wb: ExcelJS.Workbook, people: User[]): void {
    const ws = wb.addWorksheet('Особовий склад', {
        views: [{ state: 'frozen', xSplit: 3, ySplit: 4, activeCell: 'A5' }],
    });
    const columns = [...IMPULSE_COLUMNS, ...IMPULSE_INFO_COLUMNS];
    const infoFrom = IMPULSE_COLUMNS.length + 1;
    ws.columns = columns.map((column) => ({ width: column.width }));

    ws.mergeCells('N1:O1');
    ws.getCell('N1').value = 'Додаток 1';
    ws.getCell('N1').font = FONT;
    ws.getRow(1).height = 15;

    groupRow(ws, columns, infoFrom);
    columns.forEach((column, index) => {
        const info = index + 1 >= infoFrom;
        headerCell(ws.getCell(3, index + 1), column.title, info);
        // Row 4 numbers the columns of the form; information columns have no number.
        headerCell(ws.getCell(4, index + 1), info ? '' : index + 1, info);
    });
    ws.getRow(2).height = 40.9;
    ws.getRow(3).height = 46.9;
    ws.getRow(4).height = 30.75;

    people.forEach((person, index) => {
        const values = impulseRow(person);
        const row = ws.getRow(5 + index);
        columns.forEach((column, c) => dataCell(row.getCell(c + 1), values[c] ?? null, column));
    });
}

function educationSheet(wb: ExcelJS.Workbook, people: User[]): void {
    const ws = wb.addWorksheet('Освіта і курси', {
        views: [{ state: 'frozen', ySplit: 3, activeCell: 'A4' }],
    });
    const columns = IMPULSE_EDUCATION_COLUMNS;
    ws.columns = columns.map((column) => ({ width: column.width }));
    ws.getCell('F1').value = 'Додаток 2';
    ws.getCell('F1').font = FONT;
    columns.forEach((column, index) => {
        headerCell(ws.getCell(2, index + 1), column.title);
        headerCell(ws.getCell(3, index + 1), index + 1);
    });
    ws.getRow(2).height = 46.9;
    let r = 4;
    for (const person of people) {
        const values = impulseEducationRow(person);
        if (!values) continue;
        const row = ws.getRow(r++);
        columns.forEach((column, c) => dataCell(row.getCell(c + 1), values[c] ?? null, column));
    }
}

function notesSheet(wb: ExcelJS.Workbook): void {
    const ws = wb.addWorksheet('Примітки');
    ws.columns = [{ width: 26 }, { width: 110 }];
    NOTES.forEach(([title, text], index) => {
        const row = ws.getRow(index + 1);
        row.getCell(1).value = title;
        row.getCell(1).font = { ...FONT, bold: true };
        row.getCell(2).value = text;
        row.getCell(2).font = FONT;
        row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
        row.getCell(1).alignment = { vertical: 'top' };
    });
}

/** The workbook for Impulse Toolkit, built from the cards. */
export async function buildImpulseWorkbook(users: User[]): Promise<ExcelJS.Workbook> {
    const people = impulsePeople(users);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'PManager';
    personnelSheet(wb, people);
    educationSheet(wb, people);
    notesSheet(wb);
    return wb;
}

export async function generateImpulseExcel(users: User[]): Promise<void> {
    const wb = await buildImpulseWorkbook(users);
    const buffer = await wb.xlsx.writeBuffer();
    const date = new Date().toLocaleDateString('uk-UA');
    await downloadFile(buffer as ArrayBuffer, `Імпульс — особовий склад станом на ${date}.xlsx`);
}
