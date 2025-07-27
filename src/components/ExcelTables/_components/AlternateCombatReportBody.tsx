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
    console.log(report, 'report');
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
                            initialValue={0}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="plannedOfficer"
                            initialValue={0}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="plannedSoldier"
                            initialValue={0}
                            style={{ borderRightWidth: '2px' }}
                            className="border border-black"
                        />

                        {/* УКОМПЛЕКТОВАНІСТЬ */}
                        <EditableCell
                            unitName={name}
                            field="staffingPercent"
                            initialValue={0}
                            style={{ borderRightWidth: '2px' }}
                            className="border border-black"
                        />

                        {/* === ЗА СПИСКОМ === */}
                        <EditableCell
                            unitName={name}
                            field="actualTotal"
                            initialValue={0}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="actualOfficer"
                            initialValue={0}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="actualSoldier"
                            initialValue={0}
                            style={{ borderRightWidth: '2px' }}
                            className="border border-black"
                        />

                        {/* === В НАЯВНОСТІ % === */}
                        <EditableCell
                            unitName={name}
                            field="presentPercent"
                            initialValue={0}
                            style={{ borderRightWidth: '2px' }}
                            className="border border-black"
                        />

                        {/* === В НАЯВНОСТІ === */}
                        <EditableCell
                            unitName={name}
                            field="presentTotal"
                            initialValue={0}
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
                        <EditableCell
                            unitName={name}
                            field="positionsInfantry"
                            initialValue={0}
                            style={{ backgroundColor: '#9fce63' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="positionsCrew"
                            initialValue={0}
                            style={{ backgroundColor: '#d7dce3' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="positionsCalc"
                            initialValue={0}
                            style={{ backgroundColor: '#d7dce3' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="positionsUav"
                            initialValue={0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="positionsBronegroup"
                            initialValue={0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="positionsReserveInfantry"
                            initialValue={0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="rotationInfantry"
                            initialValue={0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="rotationCrew"
                            initialValue={0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="rotationCalc"
                            initialValue={0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="rotationUav"
                            initialValue={0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />

                        {/* === обмежено придатні === */}
                        <EditableCell
                            unitName={name}
                            field="nonCombatLimited"
                            initialValue={0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="nonCombatDecision"
                            initialValue={0}
                            style={{ backgroundColor: '#f9da77' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="nonCombatDecision"
                            initialValue={0}
                            style={{ backgroundColor: '#f9da77' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="nonCombatRefusers"
                            initialValue={0}
                            style={{ backgroundColor: '#f9da77' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="nonCombatExempted"
                            initialValue={0}
                            style={{ backgroundColor: '#f9da77' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="nonCombatHospitalReferral"
                            initialValue={0}
                            style={{ backgroundColor: '#f9da77', borderRightWidth: '2px' }}
                            className="border border-black"
                        />

                        {/* === НЕ БГ === */}
                        <EditableCell
                            unitName={name}
                            field="totalNonCombat"
                            initialValue={0}
                            style={{ backgroundColor: '#b89230', borderRightWidth: '2px' }}
                            className="border border-black"
                        />

                        {/* В ПІДРОЗДІЛІ */}
                        <EditableCell
                            unitName={name}
                            field="totalManagement"
                            initialValue={0}
                            style={{ borderRightWidth: '2px' }}
                            className="border border-black"
                        />

                        {/* ВІДСУТНІ */}
                        <EditableCell
                            unitName={name}
                            field="absentMedical"
                            initialValue={0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="absentAnnual"
                            initialValue={0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="absentFamily"
                            initialValue={0}
                            style={{ backgroundColor: '#eab38a' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="absentTraining"
                            initialValue={0}
                            style={{ backgroundColor: '#fcf2cf' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="absentBusinessTrip"
                            initialValue={0}
                            style={{ backgroundColor: '#fcf2cf' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="absentArrest"
                            initialValue={0}
                            style={{ backgroundColor: '#fcf2cf' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="absentHospital"
                            initialValue={0}
                            style={{ backgroundColor: '#fcf2cf' }}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="absentVLK"
                            initialValue={0}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="absent300"
                            initialValue={0}
                            className="border border-black"
                        />
                        <EditableCell
                            unitName={name}
                            field="absent500"
                            initialValue={0}
                            style={{ borderRightWidth: '2px' }}
                            className="border border-black"
                        />

                        {/* ВСЬОГО ВІДСУТНІХ */}
                        <EditableCell
                            unitName={name}
                            field="totalAbsent"
                            initialValue={0}
                            style={{ borderRightWidth: '2px' }}
                            className="border border-black"
                        />
                    </tr>
                );
            })}
        </tbody>
    );
}
