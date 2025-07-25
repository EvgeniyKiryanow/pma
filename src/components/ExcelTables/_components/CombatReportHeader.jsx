import React from 'react';
export function CombatReportHeader() {
  return (
   <thead>
                        <tr>
                            <th
                                colSpan={53}
                                className="px-4 py-4 text-center font-bold text-lg border border-black"
                            >
                                ДОНЕСЕННЯ
                            </th>
                        </tr>
                        {/* Перший рядок заголовків */}
                        <tr />
                        <tr>
                            <th
                                colSpan={53}
                                className="px-4 py-4 text-center font-bold text-lg border border-black"
                            >
                                Про бойовий та чисельний склад 1МБ 151 ОМБр на 7/25/25
                            </th>
                        </tr>
                        <tr>
                            <th
                                className=" font-medium border border-black"
                                rowSpan={2}
                                style={{ height: '3vh' }}
                            >
                                №
                            </th>
                            <th
                                className=" font-medium border border-black"
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
                                className=" font-medium border border-black"
                                colSpan={3}
                                style={{
                                    height: '3vh',
                                    backgroundColor: '#f0f0f0',
                                    borderTopWidth: '3px',
                                }}
                            >
                                ЗА ШТАТОМ
                            </th>

                            {/* % УКОМПЛЕКТОВАННОСТІ */}
                            {/* <th
                                className=" font-medium border border-black"
                                rowSpan={2}
                                style={{ height: '3vh' }}
                            >
                                % УКОМПЛЕКТОВАННОСТІ
                            </th> */}

                            {/* ЗА СПИСКОМ */}
                            <th
                                className=" font-medium border border-black"
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
                                className=" font-medium border border-black"
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
                                className=" font-medium border border-black"
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
                                className=" font-medium border border-black"
                                rowSpan={2}
                                style={{ height: '3vh', borderTopWidth: '3px' }}
                            >
                                ОФІЦЕРИ
                            </th>
                            <th
                                className=" font-medium border border-black"
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
                                className=" font-medium border border-black"
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
                                className=" font-medium border border-black"
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
                                className=" font-medium border border-black"
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
                                className=" font-medium border border-black"
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
                                className=" font-medium border border-black"
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

                        {/* Другий рядок заголовків */}
                        <tr>
                            {/* ЗА ШТАТОМ */}
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0f0f0',
                                }}
                            >
                                ВСЬОГО ЗА ШТАТОМ
                            </th>

                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0f0f0',
                                }}
                            >
                                ОФІЦЕРИ
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0f0f0',
                                    borderRightWidth: '3px',
                                }}
                            >
                                СЕРЖАНТИ/СОЛДАТИ
                            </th>

                            {/* ЗА СПИСКОМ */}
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0f0f0',
                                }}
                            >
                                % УКОМПЛЕКТОВАННОСТІ
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0f0f0',
                                }}
                            >
                                ВСЬОГО ЗА СПИСКОМ
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0f0f0',
                                }}
                            >
                                ОФІЦЕРИ
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0f0f0',
                                    borderRightWidth: '3px',
                                }}
                            >
                                СЕРЖАНТИ/СОЛДАТИ
                            </th>

                            {/* З НИХ */}
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0ccb0',
                                }}
                            >
                                На позиціях, всього
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0ccb0',
                                }}
                            >
                                ПОЗИЦІЇ ПІХОТИ
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0ccb0',
                                }}
                            >
                                ПОЗИЦІЇ ЕКІПАЖ
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0ccb0',
                                }}
                            >
                                ПОЗИЦІЇ РОЗРАХУНОК
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0ccb0',
                                }}
                            >
                                ПОЗИЦІЇ БПЛА
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#d8e9bc',
                                }}
                            >
                                РОТАЦІЯ ТА РЕЗЕРВ, всього
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#d8e9bc',
                                }}
                            >
                                РОТАЦІЯ ПІХОТА
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#d8e9bc',
                                }}
                            >
                                РОТАЦІЯ ЕКІПАЖ
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#d8e9bc',
                                }}
                            >
                                РОТАЦІЯ РОЗРАХУНОК
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#d8e9bc',
                                }}
                            >
                                РОТАЦІЯ БПЛА
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#c2d6eb',
                                }}
                            >
                                ЗАБЕСПЕЧЕННЯ, всього
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#c2d6eb',
                                }}
                            >
                                ЗАБЕСПЕЧЕННЯ, БД
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#c2d6eb',
                                }}
                            >
                                ЗАБЕСПЕЧЕННЯ, ІНЖЕНЕРНЕ
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#c2d6eb',
                                }}
                            >
                                ЗАБЕСПЕЧЕННЯ, ЖИТТЄДІЯЛЬНОСТІ
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                }}
                            >
                                УПРАВЛІННЯ
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    borderRightWidth: '3px',
                                }}
                            >
                                КСП
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    fontWeight: 'bold',
                                    backgroundColor: '#fcf2d0',
                                }}
                            >
                                не БГ всього:
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    fontWeight: 'bold',
                                    backgroundColor: '#fcf2d0',
                                }}
                            >
                                придані в інші підзозділи
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    fontWeight: 'bold',
                                    backgroundColor: '#fcf2d0',
                                }}
                            >
                                навчання,новоприбувші
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    fontWeight: 'bold',
                                    backgroundColor: '#fcf2d0',
                                }}
                            >
                                мають направлення на лік.
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    fontWeight: 'bold',
                                    backgroundColor: '#fcf2d0',
                                }}
                            >
                                звільнено від фізичного навантаження
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    fontWeight: 'bold',
                                    backgroundColor: '#fcf2d0',
                                }}
                            >
                                лікування на локації
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    fontWeight: 'bold',
                                    backgroundColor: '#fcf2d0',
                                }}
                            >
                                обмежено придатні
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    fontWeight: 'bold',
                                    backgroundColor: '#fcf2d0',
                                }}
                            >
                                очікують кадрового рішення
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    fontWeight: 'bold',
                                    backgroundColor: '#fcf2d0',
                                }}
                            >
                                відмовники
                            </th>

                            {/* ВІДСУТНІ */}
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#fcf2d0',
                                }}
                            >
                                ВІДПУСТКА ЛІКУВАННЯ
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#fcf2d0',
                                }}
                            >
                                ВІДПУСТКА ЩОРІЧНА
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#fcf2d0',
                                }}
                            >
                                ВІДПУСТКА ЗА СІМЕЙНИМИ
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#fcf2d0',
                                }}
                            >
                                НАВЧАННЯ
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#fcf2d0',
                                }}
                            >
                                ВІДРЯДЖЕННЯ
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0ccb0',
                                }}
                            >
                                АРЕШТ
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0ccb0',
                                }}
                            >
                                СЗЧ
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0ccb0',
                                }}
                            >
                                ШПИТАЛЬ
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f6cd9f',
                                }}
                            >
                                ВЛК
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0ccb0',
                                }}
                            >
                                300
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0ccb0',
                                }}
                            >
                                500
                            </th>
                            <th
                                className=" font-medium border border-black"
                                style={{
                                    maxWidth: '30px',
                                    height: '100%',
                                    wordWrap: 'break-word',
                                    transform: 'rotate(0deg)',
                                    backgroundColor: '#f0ccb0',
                                    borderRightWidth: '3px',
                                }}
                            >
                                200
                            </th>
                        </tr>
                    </thead>
  );
}
