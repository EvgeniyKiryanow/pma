import React, { useState } from 'react';
import ImportUsersTabContent from '../components/ExcelTables/ImportUsersTabContent';
import GeneratedTablesTabContent from '../components/ExcelTables/GeneratedTablesTabContent';

export default function ImportUsersTabs() {
    const [activeTab, setActiveTab] = useState<'import' | 'generated'>('import');

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
                {activeTab === 'generated' && <GeneratedTablesTabContent />}
            </div>
        </div>
    );
}
