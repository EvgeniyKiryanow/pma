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
    ws.getCell('B1').value = 'Підрозділ';
    styleHeader(ws.getCell('B1'), { backgroundColor: '#92fc7a', borderLeft: true });

    ws.mergeCells('C1:E1');
    ws.getCell('C1').value = 'За Штатом';
    styleHeader(ws.getCell('C1'), {
        backgroundColor: '#f0f0f0',
        borderLeft: true,
        borderRight: true,
    });

    ws.mergeCells('F1:F2');
    ws.getCell('F1').value = '% УКОМПЛЕКТОВАНІСТЬ';
    styleHeader(ws.getCell('F1'), {
        rotate: true,
        borderRight: true,
        padding: 20,
        borderTop: true,
    });

    ws.mergeCells('G1:I1');
    ws.getCell('G1').value = 'За Списком';
    styleHeader(ws.getCell('G1'), {
        backgroundColor: '#f0f0f0',
        borderLeft: true,
        borderRight: true,
    });

    ws.mergeCells('J1:J2');
    ws.getCell('J1').value = '% В НАЯВНОСТІ';
    styleHeader(ws.getCell('J1'), {
        rotate: true,
        borderRight: true,
        padding: 20,
        borderTop: true,
    });

    ws.mergeCells('K1:M1');
    ws.getCell('K1').value = 'В НАЯВНОСТІ';
    styleHeader(ws.getCell('K1'), {
        backgroundColor: '#f8da78',
        borderLeft: true,
        borderRight: true,
    });

    ws.mergeCells('N1:Y1');
    ws.getCell('N1').value = 'З НИХ';
    styleHeader(ws.getCell('N1'), {
        backgroundColor: '#f8da78',
        borderTop: true,
        borderBottom: true,
        bold: true,
    });

    ws.mergeCells('Z1:Z2');
    ws.getCell('Z1').value = 'ВСЬОГО НЕ БГ';
    styleHeader(ws.getCell('Z1'), {
        backgroundColor: '#b89230',
        rotate: true,
        padding: 10,
        borderTop: true,
        borderRight: true,
    });

    ws.mergeCells('AA1:AA2');
    ws.getCell('AA1').value = 'В ПІДРОЗДІЛІ';
    styleHeader(ws.getCell('AA1'), {
        rotate: true,
        padding: 10,
        borderTop: true,
        borderRight: true,
    });

    ws.mergeCells('AB1:AK1');
    ws.getCell('AB1').value = 'ВІДСУТНІ';
    styleHeader(ws.getCell('AB1'), {
        borderTop: true,
        borderBottom: true,
        borderRight: true,
        bold: true,
    });

    ws.mergeCells('AL1:AL2');
    ws.getCell('AL1').value = 'ВСЬОГО ВІДСУТНІX';
    styleHeader(ws.getCell('AL1'), {
        rotate: true,
        borderTop: true,
        borderRight: true,
    });

    // Row 2 (Detailed labels)
    const detailedLabels = [
        'Всього за штатом',
        'Офіцери',
        'Сержанти/Солдати',
        'Всього за списком',
        'Офіцери',
        'Сержанти/Солдати',
        'Всього в наявності',
        'Офіцери',
        'Сержанти/Солдати',
        'НА ПОЗИЦІЇ',
        'БРОНЄГРУПА',
        'ПОЗИЦІЇ ПІХОТИ',
        'ПОЗИЦІЇ ЕКІПАЖ',
        'ПОЗИЦІЇ РОЗРАХУНОК',
        'ПОЗИЦІЇ БПЛА',
        'РЕЗЕРВ ПІХОТА',
        'УПРАВЛІННЯ',
        'БОЙОВЕ ЗАБЕСПЕЧЕННЯ',
        'ЗАБЕСПЕЧЕННЯ',
        'НОВОПРИБУЛІ НАВЧАННЯ В ПІДЗОЗДІЛІ',
        'Обмежено придатні',
        'Хворі в підрозділі',
        'Відмовники',
        'Звільнються',
        'Мають направлення на лік / обслід/ конс/ влк',
        'ВЛК',
        'Шпиталь / Лікарня',
        'Мед. Рота',
        'Відпустка (реабілітація)',
        'Відпустка',
        'Відрядження',
        'СЗЧ',
        'Поранені',
        'Загиблі',
        'Зниклі безвісті',
    ];

    const row2 = ws.getRow(2);
    const colIdx = 3;
    detailedLabels.forEach((label, i) => {
        const cell = row2.getCell(colIdx + i);
        cell.value = label;
        styleHeader(cell, {
            backgroundColor:
                label.includes('НА ПОЗИЦІЇ') || label.includes('ПОЗИЦІЇ')
                    ? '#eab38a'
                    : label.includes('в наявності')
                      ? '#f8da78'
                      : label.includes('штатом') || label.includes('списком')
                        ? '#f0f0f0'
                        : label.includes('ВЛК') || label.includes('Шпиталь')
                          ? '#eab38a'
                          : label.includes('реабілітація') ||
                              label.includes('Відпустка') ||
                              label.includes('СЗЧ')
                            ? '#fcf2cf'
                            : undefined,
            rotate: true,
        });
    });

    ws.columns.forEach((col) => (col.width = 4.5));
    row2.height = 150;

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(
        new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `alternate_template_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
}
