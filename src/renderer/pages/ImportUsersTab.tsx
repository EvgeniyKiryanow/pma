import { FileSpreadsheet, TableProperties } from 'lucide-react';
import { useState } from 'react';

import GeneratedTablesTabContent from '../features/report/ui/GeneratedTablesTabContent';
import ImportUsersTabContent from '../features/report/ui/ImportUsersTabContent';
import { Tabs } from '../shared/ui';
import PageHeader from '../shared/ui/PageHeader';
import { usePermissions } from '../stores/sessionStore';

/** Excel section: import of personnel/staffing tables and generated reports, each behind its own permission. */
export default function ImportUsersTabs() {
    const { canAny } = usePermissions();
    const canImport = canAny('personnel.import', 'staffing.edit');
    const canViewTables = canAny('tables.view');
    const [activeTab, setActiveTab] = useState<'import' | 'generated'>(
        canImport ? 'import' : 'generated',
    );
    const current = activeTab === 'import' && !canImport ? 'generated' : activeTab;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <PageHeader
                tabs={
                    <Tabs
                        value={current}
                        onChange={setActiveTab}
                        items={[
                            {
                                value: 'import',
                                label: 'Імпорт з Excel',
                                icon: <FileSpreadsheet />,
                                hidden: !canImport,
                            },
                            {
                                value: 'generated',
                                label: 'Згенеровані таблиці',
                                icon: <TableProperties />,
                                hidden: !canViewTables,
                            },
                        ]}
                    />
                }
            />

            <div className="flex min-h-0 flex-1 flex-col">
                {current === 'import' && canImport && <ImportUsersTabContent />}
                {current === 'generated' && canViewTables && (
                    <GeneratedTablesTabContent
                        onRequestImportTab={() => canImport && setActiveTab('import')}
                    />
                )}
            </div>
        </div>
    );
}
