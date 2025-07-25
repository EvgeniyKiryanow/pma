import React from 'react';

export function CombatReportBody() {
  return (
    <tbody>
      <tr className="border-t">
        {/* № */}
        <td style={{ borderRightWidth: '3px' }} className="border border-black">
          1
        </td>
        
        {/* ПІДРОЗДІЛИ */}
        <td
          className="border border-black"
          style={{ borderLeftWidth: '3px', fontWeight: 'bold' }}
        >
          1 РОТА
        </td>
        {/* ЗА ШТАТОМ */}
        <td className="border border-black">20</td> {/* ВСЬОГО ЗА ШТАТОМ */}
        <td className="border border-black">5</td>  {/* ОФІЦЕРИ за штатом */}
        <td style={{ borderRightWidth: '3px' }} className="border border-black">
          15
        </td> {/* СЕРЖАНТИ/СОЛДАТИ за штатом */}

        {/* ЗА СПИСКОМ */}
        <td className="border border-black">90%</td> {/* % УКОМПЛЕКТОВАННОСТІ */}
        <td className="border border-black">18</td> {/* ВСЬОГО ЗА СПИСКОМ */}
        <td className="border border-black">4</td>  {/* ОФІЦЕРИ за списком */}
        <td style={{ borderRightWidth: '3px' }} className="border border-black">
          14
        </td> {/* СЕРЖАНТИ/СОЛДАТИ за списком */}

        {/* % В НАЯВНОСТІ */}
        <td style={{ borderRightWidth: '3px' }} className="border border-black">
          88%
        </td>

        {/* В НАЯВНОСТІ */}
        <td className="border border-black">85%</td> {/* В НАЯВНОСТІ всього */}
        <td className="border border-black">17</td> {/* ОФІЦЕРИ в наявності */}
        <td style={{ borderRightWidth: '3px' }} className="border border-black">
          4
        </td> {/* СЕРЖАНТИ/СОЛДАТИ в наявності */}

        {/* з наявних в районі ВБД */}
        <td className="border border-black">13</td> {/* На позиціях, всього */}
        <td className="border border-black">2</td>  {/* ПОЗИЦІЇ ПІХОТИ */}
        <td className="border border-black">1</td>  {/* ПОЗИЦІЇ ЕКІПАЖ */}
        <td className="border border-black">0</td>  {/* ПОЗИЦІЇ РОЗРАХУНОК */}
        <td className="border border-black">3</td>  {/* ПОЗИЦІЇ БПЛА */}

        <td className="border border-black">1</td>  {/* РОТАЦІЯ ТА РЕЗЕРВ, всього */}
        <td className="border border-black">2</td>  {/* РОТАЦІЯ ПІХОТА */}
        <td className="border border-black">1</td>  {/* РОТАЦІЯ ЕКІПАЖ */}
        <td className="border border-black">2</td>  {/* РОТАЦІЯ РОЗРАХУНОК */}
        <td className="border border-black">0</td>  {/* РОТАЦІЯ БПЛА */}

        <td className="border border-black">1</td>  {/* ЗАБЕСПЕЧЕННЯ, всього */}
        <td className="border border-black">2</td>  {/* ЗАБЕСПЕЧЕННЯ, БД */}
        <td className="border border-black">1</td>  {/* ЗАБЕСПЕЧЕННЯ, ІНЖЕНЕРНЕ */}
        <td className="border border-black">0</td>  {/* ЗАБЕСПЕЧЕННЯ, ЖИТТЄДІЯЛЬНОСТІ */}
        
        <td className="border border-black">3</td>  {/* УПРАВЛІННЯ */}
        <td style={{ borderRightWidth: '3px' }} className="border border-black">
          1
        </td> {/* КСП */}


        {/* причини відсутності */}
        <td className="border border-black">0</td> {/* не БГ всього */}
        <td className="border border-black">1</td> {/* придані в інші підрозділи */}
        <td className="border border-black">1</td> {/* навчання/новоприбулі */}
        <td className="border border-black">0</td> {/* мають направлення на лік. */}
        <td className="border border-black">0</td> {/* звільнено від фізичного навантаження */}
        <td className="border border-black">0</td> {/* лікування на локації */}
        <td className="border border-black">0</td> {/* обмежено придатні */}
        <td className="border border-black">0</td> {/* очікують кадрового рішення */}
        <td style={{ borderRightWidth: '3px' }} className="border border-black">
          0
        </td> {/* відмовники */}


        {/* ПІДПОРЯДКУВАННЯ ІНШІЙ В/Ч */}
        <td className="border border-black">0</td>

        {/* ППД НЕ В РАЙОНІ */}
        <td style={{ borderRightWidth: '3px' }} className="border border-black">0</td>

        {/* ВІДСУТНІСТЬ ВСЬОГО */}
        <td className="border border-black">1</td>

        {/* ВІДСУТНІ */}
        <td className="border border-black">1</td> {/* ВІДПУСТКА ЛІКУВАННЯ */}
        <td className="border border-black">0</td> {/* ВІДПУСТКА ЩОРІЧНА */}
        <td className="border border-black">0</td> {/* ВІДПУСТКА СІМЕЙНІ */}
        <td className="border border-black">1</td> {/* НАВЧАННЯ */}
        <td className="border border-black">0</td> {/* ВІДРЯДЖЕННЯ */}
        <td className="border border-black">0</td> {/* АРЕШТ */}
        <td className="border border-black">0</td> {/* СЗЧ */}
        <td className="border border-black">0</td> {/* ШПИТАЛЬ */}
        <td className="border border-black">0</td> {/* ВЛК */}
        <td className="border border-black">0</td> {/* 300 */}
        <td className="border border-black">0</td> {/* 500 */}
        <td style={{ borderRightWidth: '3px' }} className="border border-black">
          0
        </td> {/* 200 */}
      </tr>
    </tbody>
  );
}
