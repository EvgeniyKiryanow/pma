import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useShtatniStore } from '../../../stores/useShtatniStore';
import { useUserStore } from '../../../stores/userStore';
import classifyStatusForReport from '../../../helpers/classifyStatusForReport';

export async function generateStaffReportExcel() {
    const shtatniPosady = useShtatniStore.getState().shtatniPosady;
    const users = useUserStore.getState().users;

    // === Merge rows same as StaffReportTable ===
    const allRows = shtatniPosady.map((pos) => {
        const assignedUser = users.find(
            (u) => u.position === pos.position_name && u.unitMain === pos.unit_name,
        );

        const extra = pos.extra_data || {};
        const soldierStatus = assignedUser?.soldierStatus;
        const classified = classifyStatusForReport(soldierStatus);

        return {
            unit: pos.unit_name || '',
            position: pos.position_name || '',
            rank: assignedUser?.rank || '',
            fullName: assignedUser?.fullName || '',
            taxId: assignedUser?.taxId || '',
            statusInArea: extra.statusInArea || classified.statusInArea || '',
            distanceFromLVZ: extra.distanceFromLVZ || '',
            absenceReason: extra.absenceReason || classified.absenceReason || '',
            dateFrom: extra.dateFrom || '',
            dateTo: extra.dateTo || '',
            statusNote: extra.statusNote || '',
        };
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Staff Report');

    // === Header columns with custom background colors ===
    const HEADER_COLUMNS = [
        { header: 'підрозділ', key: 'unit', width: 20, headerBg: 'ffffff' },
        { header: 'посада', key: 'position', width: 40, headerBg: 'ffffff' },
        { header: 'В/звання', key: 'rank', width: 20, headerBg: 'ffffff' },
        { header: 'ПІБ', key: 'fullName', width: 30, headerBg: 'ffffff' },
        { header: 'ІПН', key: 'taxId', width: 20, headerBg: 'ffffff' },

        { header: 'статус в районі', key: 'statusInArea', width: 25, headerBg: 'fde9a9' },
        {
            header: 'Відстань від ЛВЗ (менше):',
            key: 'distanceFromLVZ',
            width: 25,
            headerBg: 'fde9a9',
        },
        {
            header: 'причина відсутності в районі',
            key: 'absenceReason',
            width: 30,
            headerBg: 'f8ccb0',
        },
        { header: 'дата з', key: 'dateFrom', width: 15, headerBg: 'f8ccb0' },
        { header: 'дата по', key: 'dateTo', width: 15, headerBg: 'f8ccb0' },
        { header: 'помилка статусів', key: 'statusNote', width: 25, headerBg: 'f7c7c7' },
    ];

    ws.columns = HEADER_COLUMNS.map((c) => ({
        header: c.header,
        key: c.key,
        width: c.width,
    }));

    const headerRow = ws.getRow(1);
    headerRow.height = 30;

    // === Style header ===
    HEADER_COLUMNS.forEach((col, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.font = { bold: true, size: 12 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: col.headerBg.replace('#', '') },
        };
        cell.border = {
            top: { style: 'thin', color: { argb: '000000' } },
            bottom: { style: 'thin', color: { argb: '000000' } },
            left: { style: 'thin', color: { argb: '000000' } },
            right: { style: 'thin', color: { argb: '000000' } },
        };
    });

    // === Determine text color for a given position ===
    function getPositionColor(position: string): string {
        const lower = position.toLowerCase();

        if (
            lower.includes('командир роти') ||
            lower.includes('заступник') ||
            lower.includes('командир взводу')
        ) {
            return 'FF0000'; // 🔴 Red for command
        }
        if (
            lower.includes('головний сержант') ||
            lower.includes('старший технік') ||
            lower.includes('медик') ||
            lower.includes('сержант')
        ) {
            return '008000'; // 🟢 Green for support roles
        }
        return '000000'; // ⚫ Default black
    }

    // === Fill data rows ===
    allRows.forEach((rowData) => {
        const row = ws.addRow(rowData);

        // Get color based on the position text
        const rowPosition = String(rowData.position || '');
        const dynamicColor = getPositionColor(rowPosition);

        row.height = 22; // a bit taller for better look

        row.eachCell((cell, colNumber) => {
            const colKey = HEADER_COLUMNS[colNumber - 1].key;

            // ✅ Common cell styles
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'thin', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } },
            };

            // ✅ Apply dynamic color to both "unit" & "position"
            if (colKey === 'unit' || colKey === 'position') {
                cell.font = { color: { argb: dynamicColor }, bold: true };
            }
        });
    });

    // ✅ Save as Excel
    const buf = await wb.xlsx.writeBuffer();
    saveAs(
        new Blob([buf], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `staff_report_${new Date().toISOString().split('T')[0]}.xlsx`,
    );
}
