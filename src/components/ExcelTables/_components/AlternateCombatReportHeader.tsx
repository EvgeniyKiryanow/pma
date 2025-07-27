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
                    // backgroundColor: '#f0f0f0',
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
                    // backgroundColor: '#f0f0f0',
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
                    // backgroundColor: '#f0f0f0',
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
                    // backgroundColor: '#f0f0f0',
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
                    // backgroundColor: '#f0f0f0',
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
                    backgroundColor: '#b89230',
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
                    backgroundColor: 'white',
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
        { label: 'Всього за штатом', leftBorder: true },
        { label: 'Офіцери' },
        { label: 'Сержанти/Солдати', rightBorder: true },

        // { label: '% УКОМПЛЕКТОВАННОСТІ', backgroundColor: '#f0f0f0' },
        { label: 'Всього за списком' },
        { label: 'Офіцери' },
        { label: 'Сержанти/Солдати', rightBorder: true },
        // В НАЯВНОСТІ
        { label: 'Всього в наявності', backgroundColor: '#f8da78' },
        { label: 'Офіцери', backgroundColor: '#f8da78' },
        { label: 'Сержанти/Солдати', backgroundColor: '#f8da78', rightBorder: true },
        // З НИХ
        { label: 'НА ПОЗИЦІЇ', backgroundColor: '#9fce63', bold: true, leftBorder: true },
        { label: 'БРОНЄГРУПА', backgroundColor: '#d7dce3', bold: true },
        { label: 'ПОЗИЦІЇ ПІХОТИ', backgroundColor: '#d7dce3', bold: true },
        { label: 'ПОЗИЦІЇ ЕКІПАЖ', backgroundColor: '#eab38a', bold: true },
        { label: 'ПОЗИЦІЇ РОЗРАХУНОК', backgroundColor: '#eab38a', bold: true },
        { label: 'ПОЗИЦІЇ БПЛА', backgroundColor: '#eab38a', bold: true },
        { label: 'РЕЗЕРВ ПІХОТА', backgroundColor: '#eab38a', bold: true },
        { label: 'УПРАВЛІННЯ', backgroundColor: '#eab38a', bold: true },
        { label: 'БОЙОВЕ ЗАБЕСПЕЧЕННЯ', backgroundColor: '#eab38a', bold: true },
        { label: 'ЗАБЕСПЕЧЕННЯ', backgroundColor: '#eab38a', bold: true },
        {
            label: 'НОВОПРИБУЛІ НАВЧАННЯ В ПІДЗОЗДІЛІ',
            backgroundColor: '#eab38a',
            rightBorder: true,
            bold: true,
        },
        { label: 'Обмежено придатні', backgroundColor: '#f9da77' },
        { label: 'Хворі в підрозділі', backgroundColor: '#f9da77' },
        { label: 'Відмовники', backgroundColor: '#f9da77' },
        { label: 'Звільнються', backgroundColor: '#f9da77' },
        { label: 'Мають направлення на лік / обслід/ конс/ влк', backgroundColor: '#f9da77' },

        // ВІДСУТНІ
        { label: 'ВЛК', backgroundColor: '#eab38a' },
        { label: 'Шпиталь / Лікарня', backgroundColor: '#eab38a' },
        { label: 'Мед. Рота', backgroundColor: '#eab38a' },
        { label: 'Відпустка (реабілітація)', backgroundColor: '#fcf2cf', bold: true },
        { label: 'Відпустка', backgroundColor: '#fcf2cf', bold: true },
        { label: 'Відрядження', backgroundColor: '#fcf2cf', bold: true },
        { label: 'СЗЧ', backgroundColor: '#fcf2cf', bold: true },
        { label: 'Поранені', bold: true },
        { label: 'Загиблі', bold: true },
        { label: 'Зниклі безвісті', bold: true },
    ];

    const labelWithBreaks: Record<string, string> = {
        'Мають направлення на лік / обслід/ конс/ влк':
            'Мають направлення<br/>на лік / обслід/ конс/ влк',
        'НОВОПРИБУЛІ НАВЧАННЯ В ПІДЗОЗДІЛІ': 'НОВОПРИБУЛІ <br/> НАВЧАННЯ В ПІДЗОЗДІЛІ',
    };
    return (
        <tr>
            {combatReportColumns.map((col, index) => {
                const shouldRotate = [
                    'Всього за штатом',
                    'Офіцери',
                    'Сержанти/Солдати',
                    'Всього за списком',
                    'Всього в наявності',
                    'НА ПОЗИЦІЇ',
                    'БРОНЄГРУПА',
                    'РЕЗЕРВ ПІХОТА',
                    'ПОЗИЦІЇ ПІХОТИ',
                    'ПОЗИЦІЇ ЕКІПАЖ',
                    'ПОЗИЦІЇ РОЗРАХУНОК',
                    'ПОЗИЦІЇ БПЛА',
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
                ].includes(col.label);

                const style: React.CSSProperties = {
                    maxWidth: '30px',
                    backgroundColor: col.backgroundColor,
                    fontWeight: col.bold ? 'bold' : undefined,
                    borderRightWidth: col.rightBorder ? '2px' : undefined,
                    borderLeftWidth: col.leftBorder ? '2px' : undefined,
                    borderTopWidth: col.topBorder ? '2px' : undefined,
                    borderBottomWidth: col.bottomBorder ? '2px' : undefined,

                    ...(shouldRotate
                        ? {
                              writingMode: 'vertical-rl',
                              transform: 'rotate(180deg)',
                              whiteSpace: 'nowrap',
                              textAlign: 'center',
                              lineHeight: '1',
                              padding: '15px',
                          }
                        : {}),
                };

                return (
                    <th key={index} className="font-medium border border-black" style={style}>
                        {labelWithBreaks[col.label] ? (
                            <span
                                dangerouslySetInnerHTML={{ __html: labelWithBreaks[col.label] }}
                            />
                        ) : (
                            col.label
                        )}
                    </th>
                );
            })}
        </tr>
    );
}
