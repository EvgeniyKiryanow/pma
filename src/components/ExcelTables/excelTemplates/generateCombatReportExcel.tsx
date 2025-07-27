import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useUserStore } from '../../../stores/userStore';
import { useShtatniStore } from '../../../stores/useShtatniStore';
import { StatusExcel } from '../../../utils/excelUserStatuses';

// ✅ count + sum helpers
function countStatuses(users: { soldierStatus?: string }[]) {
    const counts: Record<string, number> = {};
    for (const u of users) {
        if (!u.soldierStatus) continue;
        counts[u.soldierStatus] = (counts[u.soldierStatus] || 0) + 1;
    }
    return counts;
}
function sumStatuses(counts: Record<string, number>, statuses: string[]) {
    return statuses.reduce((sum, st) => sum + (counts[st] || 0), 0);
}

// ✅ STATUS_GROUPS
const STATUS_GROUPS = {
    positionsAll: [
        StatusExcel.POSITIONS_INFANTRY,
        StatusExcel.POSITIONS_CREW,
        StatusExcel.POSITIONS_CALCULATION,
        StatusExcel.POSITIONS_UAV,
    ],
    positionsInfantry: [StatusExcel.POSITIONS_INFANTRY],
    positionsCrew: [StatusExcel.POSITIONS_CREW],
    positionsCalc: [StatusExcel.POSITIONS_CALCULATION],
    positionsUav: [StatusExcel.POSITIONS_UAV],

    rotationAll: [
        StatusExcel.ROTATION_INFANTRY,
        StatusExcel.ROTATION_CREW,
        StatusExcel.ROTATION_CALCULATION,
        StatusExcel.ROTATION_UAV,
    ],
    rotationInfantry: [StatusExcel.ROTATION_INFANTRY],
    rotationCrew: [StatusExcel.ROTATION_CREW],
    rotationCalc: [StatusExcel.ROTATION_CALCULATION],
    rotationUav: [StatusExcel.ROTATION_UAV],

    supplyAll: [
        StatusExcel.SUPPLY_BD,
        StatusExcel.SUPPLY_ENGINEERING,
        StatusExcel.SUPPLY_LIFE_SUPPORT,
    ],
    supplyBd: [StatusExcel.SUPPLY_BD],
    supplyEng: [StatusExcel.SUPPLY_ENGINEERING],
    supplyLife: [StatusExcel.SUPPLY_LIFE_SUPPORT],

    management: [StatusExcel.MANAGEMENT],
    ksp: [StatusExcel.KSP],

    nonCombatAll: [
        StatusExcel.NON_COMBAT_ATTACHED_UNITS,
        StatusExcel.NON_COMBAT_TRAINING_NEWCOMERS,
        StatusExcel.NON_COMBAT_HOSPITAL_REFERRAL,
        StatusExcel.NON_COMBAT_EXEMPTED,
        StatusExcel.NON_COMBAT_TREATMENT_ON_SITE,
        StatusExcel.NON_COMBAT_LIMITED_FITNESS,
        StatusExcel.NON_COMBAT_AWAITING_DECISION,
        StatusExcel.NON_COMBAT_REFUSERS,
    ],
    nonCombatAttached: [StatusExcel.NON_COMBAT_ATTACHED_UNITS],
    nonCombatTraining: [StatusExcel.NON_COMBAT_TRAINING_NEWCOMERS],
    nonCombatHospital: [StatusExcel.NON_COMBAT_HOSPITAL_REFERRAL],
    nonCombatExempted: [StatusExcel.NON_COMBAT_EXEMPTED],
    nonCombatOnSite: [StatusExcel.NON_COMBAT_TREATMENT_ON_SITE],
    nonCombatLimited: [StatusExcel.NON_COMBAT_LIMITED_FITNESS],
    nonCombatDecision: [StatusExcel.NON_COMBAT_AWAITING_DECISION],
    nonCombatRefusers: [StatusExcel.NON_COMBAT_REFUSERS],

    absentAll: [
        StatusExcel.ABSENT_MEDICAL_LEAVE,
        StatusExcel.ABSENT_ANNUAL_LEAVE,
        StatusExcel.ABSENT_FAMILY_LEAVE,
        StatusExcel.ABSENT_TRAINING,
        StatusExcel.ABSENT_BUSINESS_TRIP,
        StatusExcel.ABSENT_ARREST,
        StatusExcel.ABSENT_SZO,
        StatusExcel.ABSENT_HOSPITAL,
        StatusExcel.ABSENT_VLK,
        StatusExcel.ABSENT_300,
        StatusExcel.ABSENT_500,
        StatusExcel.ABSENT_200,
    ],
    absentMedical: [StatusExcel.ABSENT_MEDICAL_LEAVE],
    absentAnnual: [StatusExcel.ABSENT_ANNUAL_LEAVE],
    absentFamily: [StatusExcel.ABSENT_FAMILY_LEAVE],
    absentTraining: [StatusExcel.ABSENT_TRAINING],
    absentBusinessTrip: [StatusExcel.ABSENT_BUSINESS_TRIP],
    absentArrest: [StatusExcel.ABSENT_ARREST],
    absentSZO: [StatusExcel.ABSENT_SZO],
    absentHospital: [StatusExcel.ABSENT_HOSPITAL],
    absentVLK: [StatusExcel.ABSENT_VLK],
    absent300: [StatusExcel.ABSENT_300],
    absent500: [StatusExcel.ABSENT_500],
    absent200: [StatusExcel.ABSENT_200],
};

// ✅ border styles
type BorderStyle =
    | 'thin'
    | 'medium'
    | 'dotted'
    | 'dashDot'
    | 'hair'
    | 'double'
    | 'thick'
    | 'dashDotDot'
    | 'slantDashDot'
    | 'mediumDashed'
    | 'mediumDashDot'
    | 'mediumDashDotDot';

const THICK_BORDER = { style: 'medium' as BorderStyle, color: { argb: '000000' } };
const THIN_BORDER = { style: 'thin' as BorderStyle, color: { argb: '000000' } };

const styleCell = (
    cell: ExcelJS.Cell,
    cfg: {
        backgroundColor?: string;
        bold?: boolean;
        leftBorder?: boolean;
        rightBorder?: boolean;
        topBorder?: boolean;
        bottomBorder?: boolean;
    } = {},
) => {
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.font = { bold: cfg.bold ?? false, size: 10 };

    cell.border = {
        top: cfg.topBorder ? THICK_BORDER : THIN_BORDER,
        bottom: cfg.bottomBorder ? THICK_BORDER : THIN_BORDER,
        left: cfg.leftBorder ? THICK_BORDER : THIN_BORDER,
        right: cfg.rightBorder ? THICK_BORDER : THIN_BORDER,
    };

    if (cfg.backgroundColor) {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: cfg.backgroundColor.replace('#', '') },
        };
    }
};

export async function generateCombatReportExcel() {
    const users = useUserStore.getState().users;
    const shtatniPosady = useShtatniStore.getState().shtatniPosady;

    // === basic numbers ===
    const plannedTotal = shtatniPosady.length;
    const plannedOfficers = shtatniPosady.filter((p) =>
        p.category?.trim().toLowerCase().includes('оф'),
    ).length;
    const plannedSoldiers = plannedTotal - plannedOfficers;

    const actualTotal = users.length;
    const actualOfficers = users.filter((u) =>
        u.category?.trim().toLowerCase().includes('оф'),
    ).length;
    const actualSoldiers = actualTotal - actualOfficers;

    const staffingPercent =
        plannedTotal > 0 ? ((actualTotal / plannedTotal) * 100).toFixed(0) : '0';

    const counts = countStatuses(users);

    const totalPositions = sumStatuses(counts, STATUS_GROUPS.positionsAll);
    const totalRotation = sumStatuses(counts, STATUS_GROUPS.rotationAll);
    const totalSupply = sumStatuses(counts, STATUS_GROUPS.supplyAll);
    const totalManagement = sumStatuses(counts, STATUS_GROUPS.management);
    const totalKsp = sumStatuses(counts, STATUS_GROUPS.ksp);

    const totalNonCombat = sumStatuses(counts, STATUS_GROUPS.nonCombatAll);
    const totalAbsent = sumStatuses(counts, STATUS_GROUPS.absentAll);
    const totalMissing = totalNonCombat + totalAbsent;

    const presentTotal = actualTotal - totalMissing;
    const presentPercent = actualTotal > 0 ? ((presentTotal / actualTotal) * 100).toFixed(0) : '0';

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Combat Report', { properties: { defaultRowHeight: 35 } });

    // === TITLE MERGED ROWS ===
    const TOTAL_HEADER_WIDTH = 50; // safe wide merge
    const lastHeaderColLetter = ws.getColumn(TOTAL_HEADER_WIDTH).letter;

    ws.mergeCells(`A1:${lastHeaderColLetter}1`);
    ws.getCell('A1').value = 'ДОНЕСЕННЯ';
    styleCell(ws.getCell('A1'), { bold: true });

    ws.mergeCells(`A2:${lastHeaderColLetter}2`);
    ws.getCell('A2').value =
        `Про бойовий та чисельний склад 1МБ 151 ОМБр на ${new Date().toLocaleDateString('uk-UA')}`;
    styleCell(ws.getCell('A2'), { bold: true });

    // === STATIC HEADERS ===
    ws.mergeCells('A3:A4');
    ws.getCell('A3').value = '№';
    styleCell(ws.getCell('A3'));
    ws.mergeCells('B3:B4');
    ws.getCell('B3').value = 'ПІДРОЗДІЛИ';
    styleCell(ws.getCell('B3'), {
        backgroundColor: '#f0f0f0',
        leftBorder: true,
        topBorder: true,
        bold: true,
    });

    ws.mergeCells('C3:E3');
    ws.getCell('C3').value = 'ЗА ШТАТОМ';
    styleCell(ws.getCell('C3'), { backgroundColor: '#f0f0f0', topBorder: true, bold: true });
    ['C4', 'D4', 'E4'].forEach((addr) =>
        styleCell(ws.getCell(addr), { backgroundColor: '#f0f0f0' }),
    );
    ws.getCell('C4').value = 'ВСЬОГО ЗА ШТАТОМ';
    ws.getCell('D4').value = 'ОФІЦЕРИ';
    ws.getCell('E4').value = 'СЕРЖАНТИ/СОЛДАТИ';

    ws.mergeCells('F3:I3');
    ws.getCell('F3').value = 'ЗА СПИСКОМ';
    styleCell(ws.getCell('F3'), {
        backgroundColor: '#f0f0f0',
        leftBorder: true,
        rightBorder: true,
        topBorder: true,
        bold: true,
    });
    ws.getCell('F4').value = '% УКОМПЛЕКТОВАННОСТІ';
    ws.getCell('G4').value = 'ВСЬОГО ЗА СПИСКОМ';
    ws.getCell('H4').value = 'ОФІЦЕРИ';
    ws.getCell('I4').value = 'СЕРЖАНТИ/СОЛДАТИ';
    ['F4', 'G4', 'H4', 'I4'].forEach((addr) =>
        styleCell(ws.getCell(addr), { backgroundColor: '#f0f0f0' }),
    );

    ws.mergeCells('J3:J4');
    ws.getCell('J3').value = '% В НАЯВНОСТІ';
    styleCell(ws.getCell('J3'), {
        backgroundColor: '#f0f0f0',
        leftBorder: true,
        topBorder: true,
        bold: true,
    });
    ws.mergeCells('K3:K4');
    ws.getCell('K3').value = 'В НАЯВНОСТІ ВСЬОГО';
    styleCell(ws.getCell('K3'), {
        backgroundColor: '#f8da78',
        topBorder: true,
        leftBorder: true,
        rightBorder: true,
        bold: true,
    });
    ws.mergeCells('L3:L4');
    ws.getCell('L3').value = 'ОФІЦЕРИ';
    styleCell(ws.getCell('L3'), { topBorder: true });
    ws.mergeCells('M3:M4');
    ws.getCell('M3').value = 'СЕРЖАНТИ СОЛДАТИ';
    styleCell(ws.getCell('M3'), { rightBorder: true, topBorder: true });

    // === dynamic POSITIONS ===
    const positionCols = [
        { label: 'На позиціях, всього', bg: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ ПІХОТИ', bg: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ ЕКІПАЖ', bg: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ РОЗРАХУНОК', bg: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ БПЛА', bg: '#f0ccb0' },
        { label: 'РОТАЦІЯ ТА РЕЗЕРВ, всього', bg: '#d8e9bc' },
        { label: 'РОТАЦІЯ ПІХОТА', bg: '#d8e9bc' },
        { label: 'РОТАЦІЯ ЕКІПАЖ', bg: '#d8e9bc' },
        { label: 'РОТАЦІЯ РОЗРАХУНОК', bg: '#d8e9bc' },
        { label: 'РОТАЦІЯ БПЛА', bg: '#d8e9bc' },
        { label: 'ЗАБЕСПЕЧЕННЯ, всього', bg: '#c2d6eb' },
        { label: 'ЗАБЕСПЕЧЕННЯ, БД', bg: '#c2d6eb' },
        { label: 'ЗАБЕСПЕЧЕННЯ, ІНЖЕНЕРНЕ', bg: '#c2d6eb' },
        { label: 'ЗАБЕСПЕЧЕННЯ, ЖИТТЄДІЯЛЬНОСТІ', bg: '#c2d6eb' },
        { label: 'УПРАВЛІННЯ' },
        { label: 'КСП', rightBorder: true, bold: true },
        { label: 'не БГ всього:', bg: '#fcf2d0', bold: true },
        { label: 'придані в інші підрозділи', bg: '#fcf2d0', bold: true },
        { label: 'навчання,новоприбувші', bg: '#fcf2d0', bold: true },
        { label: 'мають направлення на лік.', bg: '#fcf2d0', bold: true },
        { label: 'звільнено від фізичного навантаження', bg: '#fcf2d0', bold: true },
        { label: 'лікування на локації', bg: '#fcf2d0', bold: true },
        { label: 'обмежено придатні', bg: '#fcf2d0', bold: true },
        { label: 'очікують кадрового рішення', bg: '#fcf2d0', bold: true },
        { label: 'відмовники', bg: '#fcf2d0', bold: true },
    ];

    // merged label for group
    const posStartLetter = ws.getColumn(14).letter;
    const posEndLetter = ws.getColumn(14 + positionCols.length - 1).letter;
    ws.mergeCells(`${posStartLetter}3:${posEndLetter}3`);
    ws.getCell(`${posStartLetter}3`).value = 'з наявних в районі ВБД:';
    styleCell(ws.getCell(`${posStartLetter}3`), {
        backgroundColor: '#f8da78',
        bold: true,
        topBorder: true,
    });

    let colIndex = 14;
    positionCols.forEach((col) => {
        const c = ws.getCell(4, colIndex);
        c.value = col.label;
        styleCell(c, {
            backgroundColor: col.bg,
            topBorder: true,
            bold: col.bold,
            rightBorder: col.rightBorder,
        });
        colIndex++;
    });

    // === NEXT SPECIAL COLUMNS dynamically ===
    const afterPos = colIndex;
    const colLetterAfterPos1 = ws.getColumn(afterPos).letter;
    ws.mergeCells(`${colLetterAfterPos1}3:${colLetterAfterPos1}4`);
    ws.getCell(`${colLetterAfterPos1}3`).value = 'ПІДПОРЯДКУВАННЯ ІНШІЙ В/Ч';
    styleCell(ws.getCell(`${colLetterAfterPos1}3`), {
        backgroundColor: '#c2d6eb',
        leftBorder: true,
        topBorder: true,
    });

    const colLetterAfterPos2 = ws.getColumn(afterPos + 1).letter;
    ws.mergeCells(`${colLetterAfterPos2}3:${colLetterAfterPos2}4`);
    ws.getCell(`${colLetterAfterPos2}3`).value = 'ППД НЕ В РАЙОНІ';
    styleCell(ws.getCell(`${colLetterAfterPos2}3`), {
        backgroundColor: '#d8e9bc',
        rightBorder: true,
        topBorder: true,
    });

    const colLetterAfterPos3 = ws.getColumn(afterPos + 2).letter;
    ws.mergeCells(`${colLetterAfterPos3}3:${colLetterAfterPos3}4`);
    ws.getCell(`${colLetterAfterPos3}3`).value = 'ВІДСУТНІСТЬ ВСЬОГО:';
    styleCell(ws.getCell(`${colLetterAfterPos3}3`), {
        backgroundColor: '#f0ccb0',
        topBorder: true,
        rightBorder: true,
    });

    // === REASONS HEADER ===
    const reasonCols = [
        { label: 'ВІДПУСТКА ЛІКУВАННЯ', bg: '#fcf2d0' },
        { label: 'ВІДПУСТКА ЩОРІЧНА', bg: '#fcf2d0' },
        { label: 'ВІДПУСТКА СІМЕЙНІ', bg: '#fcf2d0' },
        { label: 'НАВЧАННЯ', bg: '#fcf2d0' },
        { label: 'ВІДРЯДЖЕННЯ', bg: '#fcf2d0' },
        { label: 'АРЕШТ', bg: '#f0ccb0' },
        { label: 'СЗЧ', bg: '#f0ccb0' },
        { label: 'ШПИТАЛЬ', bg: '#f0ccb0' },
        { label: 'ВЛК', bg: '#f6cd9f' },
        { label: '300', bg: '#f0ccb0' },
        { label: '500', bg: '#f0ccb0' },
        { label: '200', bg: '#f0ccb0', rightBorder: true },
    ];

    const reasonsStart = afterPos + 3;
    const reasonsEnd = reasonsStart + reasonCols.length - 1;
    const reasonStartLetter = ws.getColumn(reasonsStart).letter;
    const reasonEndLetter = ws.getColumn(reasonsEnd).letter;

    ws.mergeCells(`${reasonStartLetter}3:${reasonEndLetter}3`);
    ws.getCell(`${reasonStartLetter}3`).value = 'причини відсутності:';
    styleCell(ws.getCell(`${reasonStartLetter}3`), {
        backgroundColor: '#f0ccb0',
        rightBorder: true,
        topBorder: true,
        bottomBorder: true,
    });

    let reasonIndex = reasonsStart;
    reasonCols.forEach((col) => {
        const c = ws.getCell(4, reasonIndex);
        c.value = col.label;
        styleCell(c, { backgroundColor: col.bg, rightBorder: col.rightBorder });
        reasonIndex++;
    });

    // === BODY ROW aligned under exact headers ===
    const rowValues = [
        '1',
        '151 ОМБр',
        plannedTotal,
        plannedOfficers,
        plannedSoldiers,
        `${staffingPercent}%`,
        actualTotal,
        actualOfficers,
        actualSoldiers,
        `${presentPercent}%`,
        presentTotal,
        '-',
        '-',
        totalPositions,
        sumStatuses(counts, STATUS_GROUPS.positionsInfantry),
        sumStatuses(counts, STATUS_GROUPS.positionsCrew),
        sumStatuses(counts, STATUS_GROUPS.positionsCalc),
        sumStatuses(counts, STATUS_GROUPS.positionsUav),
        totalRotation,
        sumStatuses(counts, STATUS_GROUPS.rotationInfantry),
        sumStatuses(counts, STATUS_GROUPS.rotationCrew),
        sumStatuses(counts, STATUS_GROUPS.rotationCalc),
        sumStatuses(counts, STATUS_GROUPS.rotationUav),
        totalSupply,
        sumStatuses(counts, STATUS_GROUPS.supplyBd),
        sumStatuses(counts, STATUS_GROUPS.supplyEng),
        sumStatuses(counts, STATUS_GROUPS.supplyLife),
        totalManagement,
        totalKsp,
        totalNonCombat,
        sumStatuses(counts, STATUS_GROUPS.nonCombatAttached),
        sumStatuses(counts, STATUS_GROUPS.nonCombatTraining),
        sumStatuses(counts, STATUS_GROUPS.nonCombatHospital),
        sumStatuses(counts, STATUS_GROUPS.nonCombatExempted),
        sumStatuses(counts, STATUS_GROUPS.nonCombatOnSite),
        sumStatuses(counts, STATUS_GROUPS.nonCombatLimited),
        sumStatuses(counts, STATUS_GROUPS.nonCombatDecision),
        sumStatuses(counts, STATUS_GROUPS.nonCombatRefusers),
        0, // підпорядкування іншій ВЧ
        0, // ППД не в районі
        totalMissing,
        sumStatuses(counts, STATUS_GROUPS.absentMedical),
        sumStatuses(counts, STATUS_GROUPS.absentAnnual),
        sumStatuses(counts, STATUS_GROUPS.absentFamily),
        sumStatuses(counts, STATUS_GROUPS.absentTraining),
        sumStatuses(counts, STATUS_GROUPS.absentBusinessTrip),
        sumStatuses(counts, STATUS_GROUPS.absentArrest),
        sumStatuses(counts, STATUS_GROUPS.absentSZO),
        sumStatuses(counts, STATUS_GROUPS.absentHospital),
        sumStatuses(counts, STATUS_GROUPS.absentVLK),
        sumStatuses(counts, STATUS_GROUPS.absent300),
        sumStatuses(counts, STATUS_GROUPS.absent500),
        sumStatuses(counts, STATUS_GROUPS.absent200),
    ];

    const body = ws.addRow(rowValues);
    body.eachCell((c) => {
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        c.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        };
    });

    ws.columns.forEach((c) => (c.width = 4));
    ws.getRow(4).height = 140;

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
        new Blob([buf], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `combat_report_${new Date().toISOString().split('T')[0]}.xlsx`,
    );
}
