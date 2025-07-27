import React from 'react';

type ColumnConfig = {
    label: string;
    backgroundColor?: string;
    bold?: boolean;
    rightBorder?: boolean;
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
                    borderLeftWidth: '3px',
                    borderTopWidth: '3px',
                }}
            >
                ПІДРОЗДІЛИ
            </th>

            {/* ЗА ШТАТОМ */}
            <th
                className="font-medium border border-black"
                colSpan={3}
                style={{
                    height: '3vh',
                    backgroundColor: '#f0f0f0',
                    borderTopWidth: '3px',
                }}
            >
                ЗА ШТАТОМ
            </th>

            <th
                className="font-medium border border-black"
                rowSpan={2}
                style={{
                    height: '3vh',
                    backgroundColor: '#f0f0f0',
                    borderTopWidth: '3px',
                }}
            >
                % УКОМПЛЕКТОВАННОСТІ
            </th>

            {/* ЗА СПИСКОМ */}
            <th
                className="font-medium border border-black"
                colSpan={3}
                style={{
                    height: '3vh',
                    backgroundColor: '#f0f0f0',
                    borderLeftWidth: '3px',
                    borderTopWidth: '3px',
                    borderRightWidth: '3px',
                }}
            >
                ЗА СПИСКОМ
            </th>

            {/* % В НАЯВНОСТІ */}
            <th
                className="font-medium border border-black"
                rowSpan={2}
                style={{
                    height: '3vh',
                    backgroundColor: '#f0f0f0',
                    borderTopWidth: '3px',
                }}
            >
                % В НАЯВНОСТІ
            </th>

            <th
                className="font-medium border border-black"
                colSpan={3}
                style={{
                    height: '3vh',
                    backgroundColor: '#f8da78',
                    borderLeftWidth: '3px',
                    borderTopWidth: '3px',
                    borderRightWidth: '3px',
                }}
            >
                В НАЯВНОСТІ
            </th>
            {/* <th
                className="font-medium border border-black"
                rowSpan={2}
                style={{
                    height: '3vh',
                    backgroundColor: '#f8da78',
                    borderLeftWidth: '3px',
                    borderTopWidth: '3px',
                }}
            >
                В НАЯВНОСТІ ВСЬОГО
            </th>

            <th
                className="font-medium border border-black"
                rowSpan={2}
                style={{ height: '3vh', borderTopWidth: '3px' }}
            >
                ОФІЦЕРИ
            </th>

            <th
                className="font-medium border border-black"
                rowSpan={2}
                style={{
                    height: '3vh',
                    borderTopWidth: '3px',
                    borderRightWidth: '3px',
                }}
            >
                СЕРЖАНТИ СОЛДАТИ
            </th> */}

            {/* З НИХ */}
            <th
                className="font-medium border border-black"
                colSpan={16}
                style={{
                    height: '3vh',
                    backgroundColor: '#f8da78',
                    borderTopWidth: '3px',
                    borderBottomWidth: '3px',
                }}
            >
                З НИХ
            </th>

            {/* Дві окремі */}
            <th
                className="font-medium border border-black"
                rowSpan={2}
                style={{
                    height: '3vh',
                    backgroundColor: '#c2d6eb',
                    borderLeftWidth: '3px',
                    borderTopWidth: '3px',
                }}
            >
                ВСЬОГО НЕ БГ
            </th>

            <th
                className="font-medium border border-black"
                rowSpan={2}
                style={{
                    height: '3vh',
                    backgroundColor: '#d8e9bc',
                    borderTopWidth: '3px',
                    borderRightWidth: '3px',
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
                    borderTopWidth: '3px',
                    borderRightWidth: '3px',
                }}
            >
                ВІДСУТНІ
            </th>
            <th
                className="font-medium border border-black"
                rowSpan={2}
                style={{
                    height: '3vh',
                    backgroundColor: '#f0ccb0',
                    borderTopWidth: '3px',
                }}
            >
                ВІДСУТНІСТЬ ВСЬОГО:
            </th>
        </tr>
    );
}

function AlternateCombatReportHeadDetails() {
    const combatReportColumns: ColumnConfig[] = [
        { label: 'ВСЬОГО ЗА ШТАТОМ', backgroundColor: '#f0f0f0' },
        { label: 'ОФІЦЕРИ', backgroundColor: '#f0f0f0' },
        { label: 'СЕРЖАНТИ/СОЛДАТИ', backgroundColor: '#f0f0f0', rightBorder: true },

        // { label: '% УКОМПЛЕКТОВАННОСТІ', backgroundColor: '#f0f0f0' },
        { label: 'ВСЬОГО ЗА СПИСКОМ', backgroundColor: '#f0f0f0' },
        { label: 'ОФІЦЕРИ', backgroundColor: '#f0f0f0' },
        { label: 'СЕРЖАНТИ/СОЛДАТИ', backgroundColor: '#f0f0f0', rightBorder: true },

        { label: 'ВСЬОГО', backgroundColor: '#f8da78' },
        { label: 'ОФІЦЕРИ', backgroundColor: '#f8da78' },
        { label: 'СЕРЖАНТИ/СОЛДАТИ', backgroundColor: '#f8da78', rightBorder: true },

        { label: 'НА ПОЗИЦІЇ', backgroundColor: '#f0ccb0' },
        { label: 'БРОНЄГРУПА', backgroundColor: '#f0ccb0' },
        { label: 'РЕЗЕРВ ПІХОТА', backgroundColor: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ ПІХОТИ', backgroundColor: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ ЕКІПАЖ', backgroundColor: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ РОЗРАХУНОК', backgroundColor: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ БПЛА', backgroundColor: '#f0ccb0' },
        { label: 'УПРАВЛІННЯ' },
        { label: 'БОЙОВЕ ЗАБЕСПЕЧЕННЯ' },
        { label: 'ЗАБЕСПЕЧЕННЯ' },
        { label: 'НОВОПРИБУЛІ НАВЧАННЯ В ПІДЗОЗДІЛІ' },

        { label: 'Обмежено придатні', backgroundColor: '#d8e9bc' },
        { label: 'Хворі в підрозділі', backgroundColor: '#d8e9bc' },
        { label: 'Відмовники', backgroundColor: '#d8e9bc' },
        { label: 'Звільнються', backgroundColor: '#d8e9bc' },
        { label: 'Мають направлення на лік / обслід/ конс/ влк', backgroundColor: '#d8e9bc' },

        // ВІДСУТНІ
        { label: 'ВЛК', backgroundColor: '#f6cd9f' },
        { label: 'Шпиталь / Лікарня', backgroundColor: '#f0ccb0' },
        { label: 'Мед. Рота', backgroundColor: '#f0ccb0' },
        { label: 'Відпустка (реабілітація)', backgroundColor: '#fcf2d0' },
        { label: 'Відпустка', backgroundColor: '#fcf2d0' },
        { label: 'Відрядження', backgroundColor: '#fcf2d0' },
        { label: 'СЗЧ', backgroundColor: '#f0ccb0' },
        { label: 'Поранені', backgroundColor: '#f0ccb0' },
        { label: 'Загиблі', backgroundColor: '#f0ccb0' },
        { label: 'ЗагЗниклі безвістіиблі', backgroundColor: '#f0ccb0' },

        // { label: 'придані в інші підзозділи', backgroundColor: '#fcf2d0', bold: true },
        // { label: 'навчання,новоприбувші', backgroundColor: '#fcf2d0', bold: true },
        // { label: 'мають направлення на лік.', backgroundColor: '#fcf2d0', bold: true },
        // { label: 'звільнено від фізичного навантаження', backgroundColor: '#fcf2d0', bold: true },
        // { label: 'лікування на локації', backgroundColor: '#fcf2d0', bold: true },
        // { label: 'обмежено придатні', backgroundColor: '#fcf2d0', bold: true },
        // { label: 'очікують кадрового рішення', backgroundColor: '#fcf2d0', bold: true },
        // { label: 'відмовники', backgroundColor: '#fcf2d0', bold: true },

        // { label: 'ВІДПУСТКА ЛІКУВАННЯ', backgroundColor: '#fcf2d0' },
        // { label: 'ВІДПУСТКА ЩОРІЧНА', backgroundColor: '#fcf2d0' },
        // { label: 'ВІДПУСТКА ЗА СІМЕЙНИМИ', backgroundColor: '#fcf2d0' },
        // { label: 'НАВЧАННЯ', backgroundColor: '#fcf2d0' },
        // { label: 'ВІДРЯДЖЕННЯ', backgroundColor: '#fcf2d0' },
        // { label: 'АРЕШТ', backgroundColor: '#f0ccb0' },
        // { label: 'СЗЧ', backgroundColor: '#f0ccb0' },
        // { label: 'ШПИТАЛЬ', backgroundColor: '#f0ccb0' },
        // { label: 'ВЛК', backgroundColor: '#f6cd9f' },
        // { label: '300', backgroundColor: '#f0ccb0' },
        // { label: '500', backgroundColor: '#f0ccb0' },
        // { label: '200', backgroundColor: '#f0ccb0', rightBorder: true },
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
                    borderRightWidth: col.rightBorder ? '3px' : undefined,
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
