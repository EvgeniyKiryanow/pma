import { useState } from 'react';

import GeneratedTablesTabContent from '../features/report/ui/GeneratedTablesTabContent';
import ImportUsersTabContent from '../features/report/ui/ImportUsersTabContent';
import { usePermissions } from '../stores/sessionStore';

/** Excel tab: import of personnel/staffing tables and generated reports, each behind its own permission. */
export default function ImportUsersTabs() {
    const { canAny } = usePermissions();
    const canImport = canAny('personnel.import', 'staffing.edit');
    const canViewTables = canAny('tables.view');
    const [activeTab, setActiveTab] = useState<'import' | 'generated'>(
        canImport ? 'import' : 'generated',
    );
    const current = activeTab === 'import' && !canImport ? 'generated' : activeTab;

    const tabClass = (tab: 'import' | 'generated') =>
        `px-6 py-3 font-medium transition ${
            current === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
        }`;

    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex border-b bg-gray-100">
                {canImport && (
                    <button className={tabClass('import')} onClick={() => setActiveTab('import')}>
                        📥 Завантаження Таблиці
                    </button>
                )}
                {canViewTables && (
                    <button
                        className={tabClass('generated')}
                        onClick={() => setActiveTab('generated')}
                    >
                        📑 Згенеровані Таблиці
                    </button>
                )}
            </div>

            <div className="flex-1">
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
