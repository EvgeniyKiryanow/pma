import ExcelJS from 'exceljs';

import { downloadFile } from '../../../shared/lib/download';
import { toast } from '../../../shared/ui/toast';
import { useI18nStore } from '../../../stores/i18nStore';
import { useUserStore } from '../../../stores/userStore';
import { awardRows, useAwardFilters } from '../model/awardsReport';

const FONT = { name: 'Times New Roman', size: 11 } as const;
const THIN = { style: 'thin' } as const;
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

/** The «Нагороди» table as on the screen (the same filters), one award per row. */
export async function buildAwardsWorkbook(): Promise<ExcelJS.Workbook | null> {
    const { t } = useI18nStore.getState();
    const rows = awardRows(useUserStore.getState().users, useAwardFilters.getState());
    if (!rows.length) return null;

    const columns: { title: string; width: number }[] = [
        { title: t('awards.report.number'), width: 6 },
        { title: t('awards.report.rank'), width: 16 },
        { title: t('awards.report.person'), width: 32 },
        { title: t('awards.report.position'), width: 26 },
        { title: t('awards.report.staffNumber'), width: 9 },
        { title: t('awards.fields.award'), width: 44 },
        { title: t('awards.fields.awardedBy'), width: 26 },
        { title: t('awards.fields.status'), width: 16 },
        { title: t('awards.fields.submittedAt'), width: 12 },
        { title: t('awards.fields.orderDate'), width: 12 },
        { title: t('awards.fields.orderNumber'), width: 16 },
        { title: t('awards.fields.presentedAt'), width: 12 },
        { title: t('awards.fields.notes'), width: 30 },
    ];

    const wb = new ExcelJS.Workbook();
    wb.creator = 'PManager';
    const ws = wb.addWorksheet(t('awards.report.title'), {
        views: [{ state: 'frozen', ySplit: 3, activeCell: 'A4' }],
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    ws.columns = columns.map((column) => ({ width: column.width }));

    ws.mergeCells(1, 1, 1, columns.length);
    const title = ws.getCell(1, 1);
    title.value = `${t('awards.report.sheetTitle')} ${t('awards.report.asOf', {
        date: new Date().toLocaleDateString('uk-UA'),
    })}`;
    title.font = { ...FONT, size: 13, bold: true };
    title.alignment = { horizontal: 'center' };

    columns.forEach((column, index) => {
        const cell = ws.getCell(3, index + 1);
        cell.value = column.title;
        cell.font = { ...FONT, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = BORDER;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDEDED' } };
    });
    ws.getRow(3).height = 32;

    rows.forEach((row, index) => {
        const staff = String(row.user.shpkNumber ?? '');
        const values = [
            index + 1,
            row.user.rank ?? '',
            row.user.fullName ?? '',
            row.user.position ?? '',
            staff === 'excluded' || staff.includes('order') ? '' : staff,
            row.record.posthumous
                ? `${row.title} (${t('awards.fields.posthumous').toLowerCase()})`
                : row.title,
            row.record.awardedBy ?? '',
            t(`awards.statuses.${row.record.status}`),
            row.record.submittedAt ?? '',
            row.record.orderDate ?? '',
            row.record.orderNumber ?? '',
            row.record.presentedAt ?? '',
            row.record.notes ?? '',
        ];
        const excelRow = ws.getRow(4 + index);
        values.forEach((value, c) => {
            const cell = excelRow.getCell(c + 1);
            cell.value = value;
            cell.font = FONT;
            cell.border = BORDER;
            cell.alignment = { vertical: 'top', wrapText: true };
            // Numbers of orders and staff positions stay text (no «1.2E+3», no lost zeros).
            if (c === 4 || c === 10) cell.numFmt = '@';
        });
    });
    return wb;
}

export async function generateAwardsExcel(): Promise<void> {
    const wb = await buildAwardsWorkbook();
    if (!wb) {
        toast.info(useI18nStore.getState().t('awards.report.empty'));
        return;
    }
    const buffer = await wb.xlsx.writeBuffer();
    const date = new Date().toLocaleDateString('uk-UA');
    await downloadFile(buffer as ArrayBuffer, `Нагороди станом на ${date}.xlsx`);
}
