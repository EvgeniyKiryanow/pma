import React, { useEffect, useMemo } from 'react';
import { useUserStore } from '../../../stores/userStore';
import { useShtatniStore } from '../../../stores/useShtatniStore';
import { UnitStatsCalculator } from './UnitStatsCalculator';
import { EditableCell } from './EditableCell';

export function AlternateCombatReportBody() {
    const { fetchAll } = useShtatniStore();
    const { fetchUsers } = useUserStore();

    useEffect(() => {
        fetchAll();
        fetchUsers();
    }, []);

    const users = useUserStore((s) => s.users);
    const shtatniPosady = useShtatniStore((s) => s.shtatniPosady);
    const report = UnitStatsCalculator.generateFullReport(users, shtatniPosady);

    const SUBUNITS = [
        'Управління роти',
        '1-й взвод',
        '2-й взвод',
        '3-й взвод',
        'ВСЬОГО',
        'Прикомандировані',
    ];

    return (
        <tbody>
            {SUBUNITS.map((name, index) => {
                function safeReportValue(
                    report: Record<string, any>,
                    field: string,
                    fallback: string | number = '-',
                ) {
                    return report[name]?.[field] ?? fallback;
                }
                const isSummary = name === 'ВСЬОГО';
                const isAttached = name === 'Прикомандировані';
                const isNormalRow = !isSummary && !isAttached;
                return (
                    <tr key={index} className="border-t">
                        {/* === № column === */}
                        <td
                            style={{
                                borderRightWidth: '2px',
                                backgroundColor: isSummary || isAttached ? '#f0f0f0' : undefined,
                            }}
                            className="border border-black text-center"
                        >
                            {index + 1}
                        </td>
                        {/* === ПІДРОЗДІЛ === */}
                        <td
                            style={{
                                borderWidth: '2px',
                                borderRightWidth: '2px',
                                fontWeight: 'bold',
                                backgroundColor: isSummary
                                    ? '#d3d3d3'
                                    : isAttached
                                      ? '#f7f7f7'
                                      : '#92fc7a',
                            }}
                            className="border border-black"
                        >
                            {name}
                        </td>
                        {/* === ЗА ШТАТОМ === */}
                        <EditableCell
                            unitName={name}
                            field="plannedTotal"
                            initialValue={report[name]?.plannedTotal || 0}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="plannedOfficer"
                            initialValue={report[name]?.plannedOfficer || 0}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="plannedSoldier"
                            initialValue={report[name]?.plannedSoldier || 0}
                            style={{ borderRightWidth: '2px' }}
                            className="border border-black"
                        />
                        {/* УКОМПЛЕКТОВАНІСТЬ */}
                        <EditableCell
                            unitName={name}
                            field="staffingPercent"
                            initialValue={safeReportValue(report, 'staffingPercent')}
                        />
                        <EditableCell
                            unitName={name}
                            field="actualTotal"
                            initialValue={safeReportValue(report, 'actualTotal')}
                        />
                        <EditableCell
                            unitName={name}
                            field="actualOfficers"
                            initialValue={safeReportValue(report, 'actualOfficers')}
                        />
                        <EditableCell
                            unitName={name}
                            field="actualSoldiers"
                            initialValue={safeReportValue(report, 'actualSoldiers')}
                        />

                        {/* === В НАЯВНОСТІ % === */}
                        <EditableCell
                            unitName={name}
                            field="presentPercent"
                            initialValue={report[name]?.percentNowCurrent || 0}
                            style={{ borderRightWidth: '2px' }}
                            className="border border-black"
                        />
                        {/* === В НАЯВНОСТІ === */}
                        <EditableCell
                            unitName={name}
                            field="presentTotal"
                            initialValue={report[name]?.inCombatNow || 0}
                            style={{ backgroundColor: '#f8da78' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="presentOfficer"
                            initialValue={0}
                            style={{ backgroundColor: '#f8da78' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="presentSoldier"
                            initialValue={0}
                            style={{ backgroundColor: '#f8da78', borderRightWidth: '2px' }}
                            className="border border-black"
                        />
                        {/* З НИХ */}
                        {/*На позиціях */}
                        <EditableCell
                            unitName={name}
                            field="oNPostition"
                            initialValue={report[name]?.oNPostition || 0}
                            style={{ backgroundColor: '#9fce63' }}
                            className="border border-black"
                        />
                        {/*НБронегруппа */}
                        <EditableCell
                            unitName={name}
                            field="positionsBronegroup"
                            initialValue={report[name]?.positionsBronegroup || 0}
                            style={{ backgroundColor: '#d7dce3' }}
                            className="border border-black"
                        />
                        {/* позиціях піхоти */}
                        <EditableCell
                            unitName={name}
                            field="positionsInfantry"
                            initialValue={report[name]?.positionsInfantry || 0}
                            style={{ backgroundColor: '#d7dce3' }}
                            className="border border-black"
                        />
                        {/*позиціях екіпажі */}
                        <EditableCell
                            unitName={name}
                            field="positionsCrew"
                            initialValue={report[name]?.positionsCrew || 0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        {/* позиція розрахунок */}
                        <EditableCell
                            unitName={name}
                            field="positionsCalc"
                            initialValue={report[name]?.positionsCalc || 0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        {/*позиціях бпла*/}
                        <EditableCell
                            unitName={name}
                            field="positionsUav"
                            initialValue={report[name]?.positionsUav || 0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        {/*резерв піхота */}
                        <EditableCell
                            unitName={name}
                            field="positionsReserveInfantry"
                            initialValue={report[name]?.positionsReserveInfantry || 0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        {/*управління */}
                        <EditableCell
                            unitName={name}
                            field="totalManagement"
                            initialValue={report[name]?.totalManagement || 0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        {/*бойове забеспечення */}
                        <EditableCell
                            unitName={name}
                            field="supplyCombat"
                            initialValue={report[name]?.supplyCombat || 0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        {/* забеспечення */}
                        <EditableCell
                            unitName={name}
                            field="supplyGeneral"
                            initialValue={report[name]?.supplyGeneral || 0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        {/* новоприбулі */}
                        <EditableCell
                            unitName={name}
                            field="nonCombatNewcomers"
                            initialValue={report[name]?.nonCombatNewcomers || 0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        {/* === обмежено придатні === */}
                        <EditableCell
                            unitName={name}
                            field="nonCombatLimited"
                            initialValue={report[name]?.nonCombatLimited || 0}
                            style={{ backgroundColor: '#f9da77' }}
                            className="border border-black"
                        />
                        {/* === хворі в підрозділі === */}
                        <EditableCell
                            unitName={name}
                            field="nonCombatLimitedInCombat"
                            initialValue={report[name]?.nonCombatLimitedInCombat || 0}
                            style={{ backgroundColor: '#f9da77' }}
                            className="border border-black"
                        />
                        {/* === відмовники === */}
                        <EditableCell
                            unitName={name}
                            field="nonCombatRefusers"
                            initialValue={report[name]?.nonCombatRefusers || 0}
                            style={{ backgroundColor: '#f9da77' }}
                            className="border border-black"
                        />
                        {/* === звільняються === */}
                        <EditableCell
                            unitName={name}
                            field="absentRehabedOn"
                            initialValue={report[name]?.absentRehabedOn || 0}
                            style={{ backgroundColor: '#f9da77' }}
                            className="border border-black"
                        />
                        {/* === maight napravlenya === */}
                        <EditableCell
                            unitName={name}
                            field="haveOfferToJost"
                            initialValue={report[name]?.haveOfferToJost || 0}
                            style={{ backgroundColor: '#f9da77' }}
                            className="border border-black"
                        />
                        {/* === vsego ne bg === */}
                        <EditableCell
                            unitName={name}
                            field="nonOnBG"
                            initialValue={report[name]?.nonOnBG || 0}
                            style={{ backgroundColor: '#b89230', borderRightWidth: '2px' }}
                            className="border border-black"
                        />
                        {/* === v pidrizdili === */}
                        <EditableCell
                            unitName={name}
                            field="inCombatNow"
                            initialValue={report[name]?.inCombatNow || 0}
                            style={{ borderRightWidth: '2px' }}
                            className="border border-black"
                        />
                        {/* ВІДСУТНІ */}
                        {/* === VLk === */}
                        <EditableCell
                            unitName={name}
                            field="absentVLK"
                            initialValue={report[name]?.absentVLK || 0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        {/* Shpitalm */}
                        <EditableCell
                            unitName={name}
                            field="absentHospital"
                            initialValue={report[name]?.absentHospital || 0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        {/* medrota */}
                        <EditableCell
                            unitName={name}
                            field="absentMedCompany"
                            initialValue={report[name]?.absentMedCompany || 0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        {/* vidpystki reabilitaz */}
                        <EditableCell
                            unitName={name}
                            field="absentRehabLeave"
                            initialValue={report[name]?.absentRehabLeave || 0}
                            style={{ backgroundColor: '#fcf2cf' }}
                            className="border border-black"
                        />
                        {/* vidpystki  */}
                        <EditableCell
                            unitName={name}
                            field="absentRehab"
                            initialValue={report[name]?.absentRehab || 0}
                            style={{ backgroundColor: '#fcf2cf' }}
                            className="border border-black"
                        />
                        {/* vidradgenya  */}
                        <EditableCell
                            unitName={name}
                            field="absentBusinessTrip"
                            initialValue={report[name]?.absentBusinessTrip || 0}
                            style={{ backgroundColor: '#fcf2cf' }}
                            className="border border-black"
                        />
                        {/* CZSH  */}
                        <EditableCell
                            unitName={name}
                            field="absentSZO"
                            initialValue={report[name]?.absentSZO || 0}
                            style={{ backgroundColor: '#fcf2cf' }}
                            className="border border-black"
                        />
                        {/* Poranenya  */}
                        <EditableCell
                            unitName={name}
                            field="absentWounded"
                            initialValue={report[name]?.absentWounded || 0}
                            style={{}}
                            className="border border-black"
                        />
                        {/* Zagubli  */}
                        <EditableCell
                            unitName={name}
                            field="absent200"
                            initialValue={report[name]?.absent200 || 0}
                            className="border border-black"
                        />
                        {/* znukli bezvisti  */}
                        <EditableCell
                            unitName={name}
                            field="absentMIA"
                            initialValue={report[name]?.absentMIA || 0}
                            className="border border-black"
                        />
                        {/* vsego vidsytnix   */}
                        <EditableCell
                            unitName={name}
                            field="absentAllAlternative"
                            initialValue={report[name]?.absentAllAlternative || 0}
                            style={{ borderRightWidth: '2px' }}
                            className="border border-black"
                        />
                    </tr>
                );
            })}
        </tbody>
    );
}
