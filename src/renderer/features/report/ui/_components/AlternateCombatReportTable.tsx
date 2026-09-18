import type { AlternateReport } from '../../model/alternateReport';
import { AlternateCombatReportBody } from './AlternateCombatReportBody';
import { AlternateCombatReportHeader } from './AlternateCombatReportHeader';
import type { ReportCellTarget } from './ReportCellModal';

export function AlternateCombatReportTable({
    report,
    onOpenCell,
}: {
    report: AlternateReport;
    onOpenCell: (target: ReportCellTarget) => void;
}) {
    return (
        <>
            <AlternateCombatReportHeader />
            <AlternateCombatReportBody report={report} onOpenCell={onOpenCell} />
        </>
    );
}
