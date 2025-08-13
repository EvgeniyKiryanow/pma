// ImportUsersTabs.tsx
import React, { useState } from 'react';

import GeneratedTablesTabContent from '../features/report/ui/GeneratedTablesTabContent';
import ImportUsersTabContent from '../features/report/ui/ImportUsersTabContent';

export default function ImportUsersTabs() {
    const [activeTab, setActiveTab] = useState<'import' | 'generated'>('import');

    // ✅ Function to switch to "import" tab
    const goToImportTab = () => setActiveTab('import');

    return (
        <div className="flex flex-col h-full w-full">
            {/* Tabs header */}
            <div className="flex border-b bg-gray-100">
                <button
                    className={`px-6 py-3 font-medium transition ${
                        activeTab === 'import'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-600 hover:text-gray-800'
                    }`}
                    onClick={() => setActiveTab('import')}
                >
                    📥 Завантаження Таблиці
                </button>

                <button
                    className={`px-6 py-3 font-medium transition ${
                        activeTab === 'generated'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-600 hover:text-gray-800'
                    }`}
                    onClick={() => setActiveTab('generated')}
                >
                    📑 Згенеровані Таблиці
                </button>
            </div>

            {/* Tabs content */}
            <div className="flex-1">
                {activeTab === 'import' && <ImportUsersTabContent />}
                {activeTab === 'generated' && (
                    <GeneratedTablesTabContent onRequestImportTab={goToImportTab} />
                )}
            </div>
        </div>
    );
}
