import React, { useState } from 'react';
import { CombatReportTable } from './_components/CombatReportTable';
import { StaffReportTable } from './_components/StaffReportTable';
import { generateCombatReportExcel } from './excelTemplates/generateCombatReportExcel';
import { generateStaffReportExcel } from './excelTemplates/generateStaffReportExcel';

const tableSections = [
    { id: 'combat', title: '📄 ДОНЕСЕННЯ (Combat Report)' },
    { id: 'staff', title: '📄 Штатний звіт (Staff Report)' },
];

export default function GeneratedTablesTabContent() {
    const [activeTable, setActiveTable] = useState<'combat' | 'staff'>('combat');

    return (
        <div className="flex h-full">
            {/* === LEFT SIDEBAR === */}
            <aside className="w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col">
                <div className="p-4 border-b">
                    <h1 className="text-xl font-bold text-gray-800">📑 Згенеровані таблиці</h1>
                </div>

                <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                    {tableSections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveTable(section.id as 'combat' | 'staff')}
                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTable === section.id
                                    ? 'bg-green-100 text-green-700 border border-green-300'
                                    : 'hover:bg-gray-100 text-gray-700'
                            }`}
                        >
                            {section.title}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* === MAIN CONTENT AREA === */}
            <main className="flex-1 p-6 overflow-auto">
                {activeTable === 'combat' && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                        {/* Header */}
                        <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-700">📄 ДОНЕСЕННЯ</h2>
                            <span className="text-xs text-gray-500">
                                Оновлено: {new Date().toLocaleDateString()}
                            </span>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-center text-sm border-collapse">
                                <CombatReportTable />
                            </table>
                        </div>

                        {/* ✅ Export button for Combat Report */}
                        <div className="p-4 border-t flex justify-end">
                            <button
                                onClick={generateCombatReportExcel}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                            >
                                📤 Експорт Combat Report (.xlsx)
                            </button>
                        </div>
                    </div>
                )}

                {activeTable === 'staff' && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                        {/* Header */}
                        <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-700">📄 Штатний звіт</h2>
                            <span className="text-xs text-gray-500">
                                Оновлено: {new Date().toLocaleDateString()}
                            </span>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-center text-sm border-collapse">
                                <StaffReportTable />
                            </table>
                        </div>

                        {/* ✅ Export button for Staff Report */}
                        <div className="p-4 border-t flex justify-end">
                            <button
                                onClick={generateStaffReportExcel}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                            >
                                📤 Експорт Staff Report (.xlsx)
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
