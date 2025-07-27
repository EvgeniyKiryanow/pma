import React from 'react';

type ColumnConfig = {
    label: string;
    backgroundColor?: string;
    bold?: boolean;
    rightBorder?: boolean;
    leftBorder?: boolean;
    topBorder?: boolean;
    bottomBorder?: boolean;
    fontWeight?: boolean;
};

export function AlternateCombatReportHeader() {
    return (
        <thead>
            <AlternateCombatReportHeadTitle />
            <AlternateCombatReportHeadMainGroups />
            <AlternateCombatReportHeadDetails />
        </thead>
    );
}

function AlternateCombatReportHeadTitle() {
    return (
        <>
            <tr>
                <th
                    colSpan={53}
                    className="px-4 py-4 text-center font-bold text-lg border border-black"
                >
                    ДОНЕСЕННЯ
                </th>
            </tr>
            {/* Empty row just for spacing */}
            <tr />
            <tr>
                <th
                    colSpan={53}
                    className="px-4 py-4 text-center font-bold text-lg border border-black"
                >
                    Про бойовий та чисельний склад 1МБ 151 ОМБр на 7/25/25
                </th>
            </tr>
        </>
    );
}

function AlternateCombatReportHeadMainGroups() {
    return (
        <tr>
            <th className="font-medium border border-black" rowSpan={2} style={{ height: '3vh' }}>
                №
            </th>

            <th
                className="font-medium border border-black"
                rowSpan={2}
                style={{
                    height: '3vh',
                    backgroundColor: '#f0f0f0',
                    borderLeftWidth: '2px',
                    borderTopWidth: '2px',
                    fontWeight: 'bold',
                }}
            >
                Підрозділи
            </th>

            {/* ЗА ШТАТОМ */}
            <th
                className="font-medium border border-black"
                colSpan={3}
                style={{
                    height: '3vh',
                    backgroundColor: '#f0f0f0',
                    borderTopWidth: '2px',
                    borderLeftWidth: '2px',
                    borderRightWidth: '2px',
                    borderBottomWidth: '2px',
                }}
            >
                За штатом
            </th>

            <th
                className="font-medium border border-black text-center align-middle"
                rowSpan={2}
                style={{
                    height: '120px',
                    width: '50px',
                    backgroundColor: '#f0f0f0',
                    padding: '20px',
                    lineHeight: '01',
                    borderTopWidth: '2px',
                    borderRightWidth: '2px',
                    fontWeight: 'bold',
                    writingMode: 'vertical-rl', // ✅ rotates text
                    transform: 'rotate(180deg)', // ✅ flips to correct reading direction
                    whiteSpace: 'nowrap', // ✅ avoids breaking text
                }}
            >
                %<br />
                УКОМПЛЕКТОВАНІСТЬ
            </th>

            {/* ЗА СПИСКОМ */}
            <th
                className="font-medium border border-black"
                colSpan={3}
                style={{
                    height: '3vh',
                    backgroundColor: '#f0f0f0',
                    borderLeftWidth: '2px',
                    borderTopWidth: '2px',
                    borderRightWidth: '2px',
                    borderBottomWidth: '2px',
                }}
            >
                За списком
            </th>

            {/* % В НАЯВНОСТІ */}
            <th
                className="font-medium border border-black text-center align-middle"
                rowSpan={2}
                style={{
                    height: '120px',
                    width: '50px',
                    backgroundColor: '#f0f0f0',
                    padding: '20px',
                    lineHeight: '01',
                    borderTopWidth: '2px',
                    borderRightWidth: '2px',
                    fontWeight: 'bold',
                    writingMode: 'vertical-rl', // ✅ rotates text
                    transform: 'rotate(180deg)', // ✅ flips to correct reading direction
                    whiteSpace: 'nowrap', // ✅ avoids breaking text
                }}
            >
                %<br />В НАЯВНОСТІ
            </th>

            <th
                className="font-medium border border-black"
                colSpan={3}
                style={{
                    height: '3vh',
                    backgroundColor: '#f8da78',
                    borderLeftWidth: '2px',
                    borderTopWidth: '2px',
                    borderRightWidth: '2px',
                    borderBottomWidth: '2px',
                }}
            >
                В НАЯВНОСТІ
            </th>

            {/* З НИХ */}
            <th
                className="font-medium border border-black"
                colSpan={16}
                style={{
                    height: '3vh',
                    backgroundColor: '#f8da78',
                    borderTopWidth: '2px',
                    borderBottomWidth: '2px',
                    fontWeight: 'bold',
                }}
            >
                З НИХ
            </th>

            {/* Дві окремі */}
            <th
                className="font-medium border border-black text-center align-middle"
                rowSpan={2}
                style={{
                    height: '120px',
                    width: '50px',
                    backgroundColor: '#f0f0f0',
                    padding: '10px',
                    lineHeight: '01',
                    borderTopWidth: '2px',
                    borderRightWidth: '2px',
                    fontWeight: 'bold',
                    writingMode: 'vertical-rl', // ✅ rotates text
                    transform: 'rotate(180deg)', // ✅ flips to correct reading direction
                    whiteSpace: 'nowrap', // ✅ avoids breaking text
                }}
            >
                ВСЬОГО НЕ БГ
            </th>

            <th
                className="font-medium border border-black text-center align-middle"
                rowSpan={2}
                style={{
                    height: '120px',
                    width: '50px',
                    backgroundColor: '#f0f0f0',
                    padding: '10px',
                    lineHeight: '01',
                    borderTopWidth: '2px',
                    borderRightWidth: '2px',
                    fontWeight: 'bold',
                    writingMode: 'vertical-rl', // ✅ rotates text
                    transform: 'rotate(180deg)', // ✅ flips to correct reading direction
                    whiteSpace: 'nowrap', // ✅ avoids breaking text
                }}
            >
                В ПІДРОЗДІЛІ
            </th>

            {/* ВІДСУТНІ */}
            <th
                className="font-medium border border-black"
                colSpan={10}
                style={{
                    height: '3vh',
                    backgroundColor: '#f0ccb0',
                    borderTopWidth: '2px',
                    borderRightWidth: '2px',
                    borderBottomWidth: '2px',
                    fontWeight: 'bold',
                }}
            >
                ВІДСУТНІ
            </th>
            <th
                className="font-medium border border-black text-center align-middle"
                rowSpan={2}
                style={{
                    height: '120px',
                    width: '50px',
                    backgroundColor: '#f0f0f0',
                    padding: '10px',
                    lineHeight: '01',
                    borderTopWidth: '2px',
                    borderRightWidth: '2px',
                    fontWeight: 'bold',
                    writingMode: 'vertical-rl', // ✅ rotates text
                    transform: 'rotate(180deg)', // ✅ flips to correct reading direction
                    whiteSpace: 'nowrap', // ✅ avoids breaking text
                }}
            >
                ВСЬОГО ВІДСУТНІX
            </th>
        </tr>
    );
}

function AlternateCombatReportHeadDetails() {
    const combatReportColumns: ColumnConfig[] = [
        { label: 'Всього за штатом', backgroundColor: '#f0f0f0', leftBorder: true },
        { label: 'Офіцери', backgroundColor: '#f0f0f0' },
        { label: 'Сержанти/Солдати', backgroundColor: '#f0f0f0', rightBorder: true },

        // { label: '% УКОМПЛЕКТОВАННОСТІ', backgroundColor: '#f0f0f0' },
        { label: 'Всього за списком', backgroundColor: '#f0f0f0' },
        { label: 'Офіцери', backgroundColor: '#f0f0f0' },
        { label: 'Сержанти/Солдати', backgroundColor: '#f0f0f0', rightBorder: true },
        // В НАЯВНОСТІ
        { label: 'Всього в наявності', backgroundColor: '#f8da78' },
        { label: 'Офіцери', backgroundColor: '#f8da78' },
        { label: 'Сержанти/Солдати', backgroundColor: '#f8da78', rightBorder: true },
        // З НИХ
        { label: 'НА ПОЗИЦІЇ', backgroundColor: '#f0ccb0', bold: true },
        { label: 'БРОНЄГРУПА', backgroundColor: '#f0ccb0', bold: true },
        { label: 'РЕЗЕРВ ПІХОТА', backgroundColor: '#f0ccb0', bold: true },
        { label: 'ПОЗИЦІЇ ПІХОТИ', backgroundColor: '#f0ccb0', bold: true },
        { label: 'ПОЗИЦІЇ ЕКІПАЖ', backgroundColor: '#f0ccb0', bold: true },
        { label: 'ПОЗИЦІЇ РОЗРАХУНОК', backgroundColor: '#f0ccb0', bold: true },
        { label: 'ПОЗИЦІЇ БПЛА', backgroundColor: '#f0ccb0', bold: true },
        { label: 'УПРАВЛІННЯ', bold: true },
        { label: 'БОЙОВЕ ЗАБЕСПЕЧЕННЯ', bold: true },
        { label: 'ЗАБЕСПЕЧЕННЯ', bold: true },
        { label: 'НОВОПРИБУЛІ НАВЧАННЯ В ПІДЗОЗДІЛІ', rightBorder: true, bold: true },
        { label: 'Обмежено придатні', backgroundColor: '#d8e9bc' },
        { label: 'Хворі в підрозділі', backgroundColor: '#d8e9bc' },
        { label: 'Відмовники', backgroundColor: '#d8e9bc' },
        { label: 'Звільнються', backgroundColor: '#d8e9bc' },
        { label: 'Мають направлення на лік / обслід/ конс/ влк', backgroundColor: '#d8e9bc' },

        // ВІДСУТНІ
        { label: 'ВЛК', backgroundColor: '#f6cd9f' },
        { label: 'Шпиталь / Лікарня', backgroundColor: '#f0ccb0' },
        { label: 'Мед. Рота', backgroundColor: '#f0ccb0' },
        { label: 'Відпустка (реабілітація)', backgroundColor: '#fcf2d0', bold: true },
        { label: 'Відпустка', backgroundColor: '#fcf2d0', bold: true },
        { label: 'Відрядження', backgroundColor: '#fcf2d0', bold: true },
        { label: 'СЗЧ', backgroundColor: '#f0ccb0', bold: true },
        { label: 'Поранені', backgroundColor: '#f0ccb0', bold: true },
        { label: 'Загиблі', backgroundColor: '#f0ccb0', bold: true },
        { label: 'Зниклі ,безвісті', backgroundColor: '#f0ccb0', bold: true },
    ];

    return (
        <tr>
            {combatReportColumns.map((col, index) => {
                const style: React.CSSProperties = {
                    maxWidth: '30px',
                    height: '100%',
                    wordWrap: 'break-word',
                    transform: 'rotate(0deg)',
                    backgroundColor: col.backgroundColor,
                    fontWeight: col.bold ? 'bold' : undefined,
                    borderRightWidth: col.rightBorder ? '2px' : undefined,
                    borderLeftWidth: col.leftBorder ? '2px' : undefined,
                    borderTopWidth: col.topBorder ? '2px' : undefined,
                    borderBottomWidth: col.bottomBorder ? '2px' : undefined,
                };

                return (
                    <th key={index} className="font-medium border border-black" style={style}>
                        {col.label}
                    </th>
                );
            })}
        </tr>
    );
}
