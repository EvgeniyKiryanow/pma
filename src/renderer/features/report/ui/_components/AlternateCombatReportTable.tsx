import { AlternateCombatReportHeader } from './AlternateCombatReportHeader';
import { AlternateCombatReportBody } from './AlternateCombatReportBody';

// На даному етапі повністю така ж таблиця
export function AlternateCombatReportTable() {
    return (
        <>
            <AlternateCombatReportHeader />
            <AlternateCombatReportBody />
        </>
    );
}
