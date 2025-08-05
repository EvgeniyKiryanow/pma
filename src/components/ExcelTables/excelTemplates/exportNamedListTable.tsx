import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useNamedListStore } from '../../../stores/useNamedListStore';

export async function exportNamedListTable() {
    const { activeKey, tables } = useNamedListStore.getState();
    if (!activeKey || !tables[activeKey]) {
        alert('⚠️ Немає активної таблиці для експорту.');
        return;
    }

    const tableData = tables[activeKey];
    const [year, monthStr] = activeKey.split('-');
    const month = parseInt(monthStr, 10);
    const dayCount = new Date(Number(year), month, 0).getDate();

    const monthNames = [
        'Січень',
        'Лютий',
        'Березень',
        'Квітень',
        'Травень',
        'Червень',
        'Липень',
        'Серпень',
        'Вересень',
        'Жовтень',
        'Листопад',
        'Грудень',
    ];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Іменний список');

    // Styling helpers
    const center = { vertical: 'middle', horizontal: 'center' };
    const boldCenter = { ...center, wrapText: true };

    const addTitle = () => {
        sheet.addRow([]); // spacing row

        const width = 3 + dayCount;
        const startCol = Math.max(width - 9, 1); // right 9 columns (adjust if needed)
        const endCol = width;

        const rightAlignedText = [
            'Додаток 4',
            'до Інструкції з організації обліку особового складу',
            'Збройних Сил України',
            '(пункт 1 розділу IV)',
        ];

        for (const text of rightAlignedText) {
            const row = sheet.addRow([]);
            const from = sheet.getColumn(startCol).letter + row.number;
            const to = sheet.getColumn(endCol).letter + row.number;

            sheet.mergeCells(`${from}:${to}`);

            const cell = row.getCell(startCol);
            cell.value = text;
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
            cell.font = { size: 10 };
        }

        sheet.addRow([]); // space after header block

        const centerRow = (text: string, options?: { bold?: boolean; uppercase?: boolean }) => {
            const row = sheet.addRow([options?.uppercase ? text.toUpperCase() : text]);
            sheet.mergeCells(`A${row.number}:${sheet.getColumn(width).letter}${row.number}`);
            const cell = row.getCell(1);
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.font = {
                size: 12,
                bold: options?.bold ?? false,
            };
        };

        centerRow('ІМЕННИЙ СПИСОК', { bold: true });
        centerRow('для проведення вечірньої повірки', { bold: true });
        centerRow('3 МЕХАНІЗОВАНА РОТА 1 МЕХАНІЗОВАНОГО БАТАЛЬЙОНУ ВІЙСЬКОВОЇ ЧАСТИНИ А4941', {
            uppercase: true,
        });
    };

    const addHeader = (monthName: string) => {
        const colCount = 3 + dayCount;
        const header1 = [
            '№ з/п',
            'Військове звання',
            'Прізвище, власне ім’я',
            ...Array(dayCount).fill(monthName),
        ];
        const header2 = ['', '', '', ...Array(dayCount).fill('Дні місяця')];
        const header3 = ['', '', '', ...Array.from({ length: dayCount }, (_, i) => i + 1)];

        sheet.addRow(header1);
        sheet.addRow(header2);
        sheet.addRow(header3);

        const startRow = sheet.lastRow.number - 2;
        for (let r = startRow; r <= startRow + 2; r++) {
            for (let c = 1; c <= colCount; c++) {
                const cell = sheet.getRow(r).getCell(c);
                cell.alignment = boldCenter;
                cell.font = { bold: true, size: 10 };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            }
        }

        // Merge title cells vertically
        for (let i = 1; i <= 3; i++) {
            sheet.mergeCells(startRow, i, startRow + 2, i);
        }
        // Merge month names horizontally
        sheet.mergeCells(startRow, 4, startRow, 3 + dayCount);
        sheet.mergeCells(startRow + 1, 4, startRow + 1, 3 + dayCount);
    };

    const addChunkRows = (rows: any[]) => {
        for (const row of rows) {
            const values = [
                row.id,
                row.rank,
                row.fullName,
                ...row.attendance.slice(0, dayCount).map((v) => v.toUpperCase()),
            ];
            const newRow = sheet.addRow(values);
            newRow.height = 22; // 🔼 slightly taller for visibility

            for (let i = 1; i <= values.length; i++) {
                const cell = newRow.getCell(i);
                cell.alignment = { vertical: 'middle', horizontal: 'center' };

                // Only make attendance values bold (after 3rd col)
                if (i > 3 && values[i - 1]) {
                    cell.font = { size: 10, bold: true };
                } else {
                    cell.font = { size: 10 };
                }

                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            }
        }
    };

    const chunkSize = 14;
    let chunkIndex = 0;

    addTitle();

    while (chunkIndex < tableData.length) {
        const chunk = tableData.slice(chunkIndex, chunkIndex + chunkSize);

        if (chunkIndex !== 0) {
            const contRow = sheet.addRow(['Продовження Додатка 4']);
            const width = 3 + dayCount;

            sheet.mergeCells(
                `A${contRow.number}:${sheet.getColumn(width).letter}${contRow.number}`,
            );

            contRow.height = 18;
            const cell = contRow.getCell(1);
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.font = { size: 6 };
        }

        addHeader(monthNames[month - 1]);
        addChunkRows(chunk);
        chunkIndex += chunkSize;
    }

    sheet.addRow([]);
    const signRow = sheet.addRow(['', '', 'Підпис відповідального:']);
    signRow.getCell(3).font = { italic: true };

    // Set column widths
    sheet.columns = [
        { width: 5 },
        { width: 20 },
        { width: 30 },
        ...Array(dayCount).fill({ width: 4 }),
    ];

    // Generate file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `Іменний_список_${year}_${monthStr}.xlsx`);
}
