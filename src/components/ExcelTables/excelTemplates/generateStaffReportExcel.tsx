import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useShtatniStore } from '../../../stores/useShtatniStore';
import { useUserStore } from '../../../stores/userStore';
import classifyStatusForReport from '../../../helpers/classifyStatusForReport';

const STAFF_COLUMNS = [
    { key: 'shtatNumber', label: '№ посади' },
    { key: 'unit', label: 'Підрозділ' },
    { key: 'position', label: 'Посада' },
    { key: 'rank', label: 'В/звання' },
    { key: 'fullName', label: 'ПІБ' },
    { key: 'taxId', label: 'ІПН' },

    { key: 'statusInArea', label: 'статус в районі', background: '#fde9a9' },
    { key: 'distanceFromLVZ', label: 'Відстань від ЛВЗ (менше):', background: '#fde9a9' },
    { key: 'absenceReason', label: 'причина відсутності в районі', background: '#f8ccb0' },
    { key: 'dateFrom', label: 'дата з', background: '#f8ccb0' },
    { key: 'dateTo', label: 'дата по', background: '#f8ccb0' },
    { key: 'statusNote', label: 'помилка статусів', background: '#f7c7c7' },
];

export async function generateStaffReportExcel() {
    // ✅ get data directly
    const shtatniPosady = useShtatniStore.getState().shtatniPosady;
    const users = useUserStore.getState().users;

    // ✅ sort by shtat_number numeric
    const sorted = [...shtatniPosady].sort((a, b) => {
        const nA = parseInt(a.shtat_number.replace(/\D/g, ''), 10) || 0;
        const nB = parseInt(b.shtat_number.replace(/\D/g, ''), 10) || 0;
        return nA - nB;
    });

    // ✅ merge shtatniPosady + users + classification
    const mergedRows = sorted.map((pos) => {
        const assignedUser = users.find(
            (u) => u.position === pos.position_name && u.unitMain === pos.unit_name,
        );

        const extra = pos.extra_data || {};
        const soldierStatus = assignedUser?.soldierStatus;
        const classified = classifyStatusForReport(soldierStatus);

        return {
            shtatNumber: pos.shtat_number,
            unit: pos.unit_name || '',
            position: pos.position_name || '',
            fullName: assignedUser?.fullName || '',
            rank: assignedUser?.rank || '',
            taxId: assignedUser?.taxId || '',

            statusInArea: extra.statusInArea || classified.statusInArea,
            distanceFromLVZ: extra.distanceFromLVZ || '',
            absenceReason: extra.absenceReason || classified.absenceReason,
            dateFrom: extra.dateFrom || '',
            dateTo: extra.dateTo || '',
            statusNote: extra.statusNote || '',
        };
    });

    // ✅ Create workbook
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Staff Report', {
        properties: { defaultRowHeight: 25 },
        views: [{ state: 'frozen', ySplit: 2 }], // freeze header rows
    });

    // === HEADER TITLE ROW ===
    const nowStr = new Date().toLocaleDateString('uk-UA');
    const lastColLetter = ws.getColumn(STAFF_COLUMNS.length).letter;
    ws.mergeCells(`A1:${lastColLetter}1`);
    ws.getCell('A1').value = `📋 Звіт по особовому складу (станом на ${nowStr})`;
    ws.getCell('A1').font = { size: 14, bold: true };
    ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    // === COLUMN HEADER ROW ===
    const headerRow = ws.addRow(STAFF_COLUMNS.map((c) => c.label));

    headerRow.height = 30;
    headerRow.eachCell((cell, colNumber) => {
        const colConfig = STAFF_COLUMNS[colNumber - 1];
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.font = { bold: true, size: 12 };
        cell.border = {
            top: { style: 'medium' },
            left: { style: 'thin' },
            bottom: { style: 'medium' },
            right: { style: 'thin' },
        };

        if (colConfig?.background) {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colConfig.background.replace('#', '') },
            };
        } else {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'EEEEEE' }, // default light gray
            };
        }
    });

    // === BODY ROWS ===
    mergedRows.forEach((rowData, rowIndex) => {
        const row = ws.addRow(STAFF_COLUMNS.map((c) => (rowData as any)[c.key] ?? ''));

        // alternate row color
        const isEven = rowIndex % 2 === 0;
        row.eachCell((cell, colNumber) => {
            const colConfig = STAFF_COLUMNS[colNumber - 1];
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };

            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {
                    argb: colConfig?.background
                        ? colConfig.background.replace('#', '')
                        : isEven
                          ? 'FFFFFF'
                          : 'F7F7F7',
                },
            };
        });
    });

    // === Auto-fit column widths ===
    STAFF_COLUMNS.forEach((col, idx) => {
        const column = ws.getColumn(idx + 1);
        const maxLength = Math.max(
            col.label.length,
            ...mergedRows.map((r) => (r[col.key] ? String(r[col.key]).length : 0)),
        );
        column.width = Math.min(Math.max(maxLength + 4, 15), 50);
    });

    // === Save file ===
    const buf = await wb.xlsx.writeBuffer();
    saveAs(
        new Blob([buf], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `staff_report_${new Date().toISOString().split('T')[0]}.xlsx`,
    );
}
