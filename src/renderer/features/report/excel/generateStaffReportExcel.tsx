import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import classifyStatusForReport from '../../../../helpers/classifyStatusForReport';
import { useShtatniStore } from '../../../../stores/useShtatniStore';
import { useUserStore } from '../../../stores/userStore';

export async function generateStaffReportExcel() {
    const shtatniPosady = useShtatniStore.getState().shtatniPosady;
    const users = useUserStore.getState().users;

    // === Sort positions ===
    const sortedPosady = [...shtatniPosady].sort((a, b) => {
        const numA = parseInt(a.shtat_number.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.shtat_number.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
    });

    // === Group with headers ===
    const groupedWithHeaders: Array<{ type: 'header' | 'pos'; data: string | any }> = [];
    let lastHeader = '';
    sortedPosady.forEach((pos) => {
        const unitName = (pos.unit_name || '').trim();

        if (
            unitName.toLowerCase().includes('управління') ||
            unitName.toLowerCase().includes('взвод') ||
            unitName.toLowerCase().includes('відділення')
        ) {
            if (unitName !== lastHeader) {
                groupedWithHeaders.push({ type: 'header', data: unitName });
                lastHeader = unitName;
            }
        }
        groupedWithHeaders.push({ type: 'pos', data: pos });
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Staff Report');

    // === Header columns (renamed!) ===
    const HEADER_COLUMNS = [
        { header: 'Номер посади', key: 'shtatNumber', width: 15, headerBg: 'ffffff' },
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

    // === Header row ===
    const headerRowIndex = 1;
    const headerRow = ws.getRow(headerRowIndex);
    headerRow.height = 30;
    HEADER_COLUMNS.forEach((col, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = col.header;
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

    // === Add yellow separator line (AFTER header) ===
    const yellowRowIndex = headerRowIndex + 1;
    const yellowMerge = `A${yellowRowIndex}:F${yellowRowIndex}`; // merge until ІПН
    ws.mergeCells(yellowMerge);
    const yellowCell = ws.getCell(`A${yellowRowIndex}`);
    yellowCell.value = '1 механізована рота';
    yellowCell.font = { size: 12, color: { argb: '000000' } }; // not bold
    yellowCell.alignment = { horizontal: 'left', vertical: 'middle' };
    yellowCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF00' }, // plain yellow
    };
    // No borders for yellow

    // === Text color rules for positions ===
    function getPositionColor(position: string): string {
        const lower = position.toLowerCase();

        if (
            lower.includes('командир роти') ||
            lower.includes('командир взводу') ||
            lower.includes('заступник')
        ) {
            return 'FF0000'; // red
        }
        if (
            lower.includes('головний сержант') ||
            lower.includes('старший технік') ||
            lower.includes('медик') ||
            lower.includes('сержант')
        ) {
            return '008000'; // green
        }
        return '000000'; // black
    }

    // === Start writing data after yellow line ===
    let currentRow = yellowRowIndex + 1;

    groupedWithHeaders.forEach((item, index) => {
        if (item.type === 'header') {
            const groupTitle = item.data as string;

            // ✅ SKIP the very first header after yellow (orange one)
            if (index === 0) return;

            const mergeRange = `A${currentRow}:F${currentRow}`;
            ws.mergeCells(mergeRange);

            const headerCell = ws.getCell(`A${currentRow}`);
            headerCell.value = groupTitle;
            headerCell.font = { size: 12, color: { argb: '000000' } }; // no bold
            headerCell.alignment = { horizontal: 'left', vertical: 'middle' };

            // Color depends if "Управління" or not
            if (groupTitle.toLowerCase().includes('управління')) {
                headerCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'F28C28' }, // orange
                };
            } else {
                headerCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'C6E0B4' }, // light green
                };
            }

            // No borders for these lines
            currentRow++;
        } else {
            const pos = item.data;
            const assignedUser = users.find(
                (u) => u.position === pos.position_name && u.unitMain === pos.unit_name,
            );

            const extra = pos.extra_data || {};
            const soldierStatus = assignedUser?.soldierStatus;
            const classified = classifyStatusForReport(soldierStatus);

            const rowData = {
                shtatNumber: pos.shtat_number || '',
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

            const row = ws.addRow(rowData);
            row.height = 22;

            const rowColor = getPositionColor(rowData.position);

            row.eachCell((cell, colNumber) => {
                const colKey = HEADER_COLUMNS[colNumber - 1].key;

                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = {
                    top: { style: 'thin', color: { argb: '000000' } },
                    bottom: { style: 'thin', color: { argb: '000000' } },
                    left: { style: 'thin', color: { argb: '000000' } },
                    right: { style: 'thin', color: { argb: '000000' } },
                };

                // Color for підрозділ & посада
                if (colKey === 'unit' || colKey === 'position') {
                    cell.font = { color: { argb: rowColor }, bold: true };
                }
            });

            currentRow++;
        }
    });

    // ✅ Save Excel
    const buf = await wb.xlsx.writeBuffer();
    saveAs(
        new Blob([buf], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `staff_report_${new Date().toISOString().split('T')[0]}.xlsx`,
    );
}
