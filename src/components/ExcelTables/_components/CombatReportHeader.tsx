import React from 'react';
type ColumnConfig = {
    label: string;
    backgroundColor?: string;
    bold?: boolean;
    rightBorder?: boolean;
};

export function CombatReportHeader() {
    return (
        <thead>
            <CombatReportHeadTitle />
            <CombatReportHeadMainGroups />
            <CombatReportHeadDetails />
        </thead>
    );
}
function CombatReportHeadTitle() {
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
function CombatReportHeadMainGroups() {
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

            {/* ЗА СПИСКОМ */}
            <th
                className="font-medium border border-black"
                colSpan={4}
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
            </th>

            {/* З НИХ */}
            <th
                className="font-medium border border-black"
                colSpan={25}
                style={{
                    height: '3vh',
                    backgroundColor: '#f8da78',
                    borderTopWidth: '3px',
                    borderBottomWidth: '3px',
                }}
            >
                з наявних в районі ВБД:
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
                ПІДПОРЯДКУВАННЯ ІНШІЙ В/Ч
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
                ППД НЕ В РАЙОНІ
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

            {/* ВІДСУТНІ */}
            <th
                className="font-medium border border-black"
                colSpan={12}
                style={{
                    height: '3vh',
                    backgroundColor: '#f0ccb0',
                    borderTopWidth: '3px',
                    borderRightWidth: '3px',
                }}
            >
                причини відсутності:
            </th>
        </tr>
    );
}
function CombatReportHeadDetails() {
    const combatReportColumns: ColumnConfig[] = [
        // ==== ЗА ШТАТОМ ====
        { label: 'ВСЬОГО ЗА ШТАТОМ', backgroundColor: '#f0f0f0' },
        { label: 'ОФІЦЕРИ', backgroundColor: '#f0f0f0' },
        { label: 'СЕРЖАНТИ/СОЛДАТИ', backgroundColor: '#f0f0f0', rightBorder: true },

        // ==== ЗА СПИСКОМ ====
        { label: '% УКОМПЛЕКТОВАННОСТІ', backgroundColor: '#f0f0f0' },
        { label: 'ВСЬОГО ЗА СПИСКОМ', backgroundColor: '#f0f0f0' },
        { label: 'ОФІЦЕРИ', backgroundColor: '#f0f0f0' },
        { label: 'СЕРЖАНТИ/СОЛДАТИ', backgroundColor: '#f0f0f0', rightBorder: true },

        // ==== З НИХ ====
        { label: 'На позиціях, всього', backgroundColor: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ ПІХОТИ', backgroundColor: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ ЕКІПАЖ', backgroundColor: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ РОЗРАХУНОК', backgroundColor: '#f0ccb0' },
        { label: 'ПОЗИЦІЇ БПЛА', backgroundColor: '#f0ccb0' },

        // ==== РОТАЦІЯ ====
        { label: 'РОТАЦІЯ ТА РЕЗЕРВ, всього', backgroundColor: '#d8e9bc' },
        { label: 'РОТАЦІЯ ПІХОТА', backgroundColor: '#d8e9bc' },
        { label: 'РОТАЦІЯ ЕКІПАЖ', backgroundColor: '#d8e9bc' },
        { label: 'РОТАЦІЯ РОЗРАХУНОК', backgroundColor: '#d8e9bc' },
        { label: 'РОТАЦІЯ БПЛА', backgroundColor: '#d8e9bc' },

        // ==== ЗАБЕСПЕЧЕННЯ ====
        { label: 'ЗАБЕСПЕЧЕННЯ, всього', backgroundColor: '#c2d6eb' },
        { label: 'ЗАБЕСПЕЧЕННЯ, БД', backgroundColor: '#c2d6eb' },
        { label: 'ЗАБЕСПЕЧЕННЯ, ІНЖЕНЕРНЕ', backgroundColor: '#c2d6eb' },
        { label: 'ЗАБЕСПЕЧЕННЯ, ЖИТТЄДІЯЛЬНОСТІ', backgroundColor: '#c2d6eb' },
        { label: 'УПРАВЛІННЯ' },
        { label: 'КСП', rightBorder: true },

        // ==== не БГ ====
        { label: 'не БГ всього:', backgroundColor: '#fcf2d0', bold: true },
        { label: 'придані в інші підзозділи', backgroundColor: '#fcf2d0', bold: true },
        { label: 'навчання,новоприбувші', backgroundColor: '#fcf2d0', bold: true },
        { label: 'мають направлення на лік.', backgroundColor: '#fcf2d0', bold: true },
        { label: 'звільнено від фізичного навантаження', backgroundColor: '#fcf2d0', bold: true },
        { label: 'лікування на локації', backgroundColor: '#fcf2d0', bold: true },
        { label: 'обмежено придатні', backgroundColor: '#fcf2d0', bold: true },
        { label: 'очікують кадрового рішення', backgroundColor: '#fcf2d0', bold: true },
        { label: 'відмовники', backgroundColor: '#fcf2d0', bold: true },

        // ==== ВІДСУТНІ ====
        { label: 'ВІДПУСТКА ЛІКУВАННЯ', backgroundColor: '#fcf2d0' },
        { label: 'ВІДПУСТКА ЩОРІЧНА', backgroundColor: '#fcf2d0' },
        { label: 'ВІДПУСТКА ЗА СІМЕЙНИМИ', backgroundColor: '#fcf2d0' },
        { label: 'НАВЧАННЯ', backgroundColor: '#fcf2d0' },
        { label: 'ВІДРЯДЖЕННЯ', backgroundColor: '#fcf2d0' },
        { label: 'АРЕШТ', backgroundColor: '#f0ccb0' },
        { label: 'СЗЧ', backgroundColor: '#f0ccb0' },
        { label: 'ШПИТАЛЬ', backgroundColor: '#f0ccb0' },
        { label: 'ВЛК', backgroundColor: '#f6cd9f' },
        { label: '300', backgroundColor: '#f0ccb0' },
        { label: '500', backgroundColor: '#f0ccb0' },
        { label: '200', backgroundColor: '#f0ccb0', rightBorder: true },
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
