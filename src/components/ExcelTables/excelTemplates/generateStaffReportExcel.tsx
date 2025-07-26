// src/excelTemplates/generateStaffReportExcel.ts
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export async function generateStaffReportExcel() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Staff Report');

    // ✅ Example simple header
    ws.mergeCells('A1:D1');
    ws.getCell('A1').value = 'Штатний звіт (приклад)';
    ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell('A1').font = { bold: true, size: 14 };

    // ✅ Example columns
    ws.addRow(['№', 'ПІБ', 'Посада', 'Підрозділ']);

    // ✅ Example dummy rows
    ws.addRow(['1', 'Іваненко Іван Іванович', 'Командир роти', '1 рота']);
    ws.addRow(['2', 'Петренко Петро Петрович', 'Стрілець', '1 рота']);

    // ✅ Save file
    const buf = await wb.xlsx.writeBuffer();
    saveAs(
        new Blob([buf], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        'staff_report.xlsx',
    );
}
