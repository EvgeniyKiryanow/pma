// GeneratedTablesTabContent.tsx
import React, { useEffect, useState } from 'react';
import { CombatReportTable } from './_components/CombatReportTable';
import { StaffReportTable } from './_components/StaffReportTable';
import { generateCombatReportExcel } from './excelTemplates/generateCombatReportExcel';
import { generateStaffReportExcel } from './excelTemplates/generateStaffReportExcel';
import { useShtatniStore } from '../../stores/useShtatniStore';
import { AlternateCombatReportTable } from './_components/AlternateCombatReportTable';
import { generateAlternateCombatReportExcelTemplate } from './excelTemplates/generateAlternateCombatReportExcelTemplate';
import { useUserStore } from '../../stores/userStore';
import { UnitStatsCalculator } from './_components/UnitStatsCalculator';

type Props = {
    onRequestImportTab?: () => void; // ✅ new optional callback
};

export default function GeneratedTablesTabContent({ onRequestImportTab }: Props) {
    const [activeTable, setActiveTable] = useState<'combat' | 'staff' | 'alternate'>('combat');
    const { shtatniPosady } = useShtatniStore();
    const hasShtatni = shtatniPosady.length > 0;
    const { fetchAll } = useShtatniStore();
    const { fetchUsers } = useUserStore();

    useEffect(() => {
        fetchAll();
        fetchUsers();
    }, []);

    const users = useUserStore((s) => s.users);
    const report = UnitStatsCalculator.generateFullReport(users, shtatniPosady);

    const tableSections = [
        // { id: 'combat', title: '📄 ДОНЕСЕННЯ (Combat Report)' },
        { id: 'alternate', title: '📄 Альтернативний звіт (Alternate Report)' },
        { id: 'staff', title: '📄 Штатний звіт (Staff Report)' },
    ];

    return (
        <div className="flex h-full">
            {/* === LEFT SIDEBAR === */}
            <aside className="w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col">
                <div className="p-4 border-b">
                    <h1 className="text-xl font-bold text-gray-800">📑 Згенеровані таблиці</h1>
                </div>

                <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                    {tableSections.map((section) => {
                        const isActive = activeTable === section.id;
                        const disabled = !hasShtatni;

                        return (
                            <div key={section.id} className="relative group flex items-center">
                                <button
                                    onClick={() => {
                                        if (!disabled)
                                            setActiveTable(section.id as 'combat' | 'staff');
                                    }}
                                    className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        disabled
                                            ? 'opacity-50 cursor-not-allowed'
                                            : isActive
                                              ? 'bg-green-100 text-green-700 border border-green-300'
                                              : 'hover:bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    {section.title}
                                </button>

                                {disabled && (
                                    <div
                                        className="absolute left-full top-1/2 -translate-y-1/2 ml-3 
                                            hidden group-hover:flex
                                            bg-gray-800 text-white text-xs rounded-md px-3 py-2 shadow-lg 
                                            w-[220px] leading-snug z-50"
                                    >
                                        🛈 Щоб увімкнути ці звіти, спочатку імпортуйте або додайте
                                        БЧС
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </aside>

            {/* === MAIN CONTENT AREA === */}
            <main className="flex-1 p-6 overflow-auto">
                {!hasShtatni ? (
                    <div className="flex flex-col items-center justify-center text-center mt-20 space-y-4">
                        <h2 className="text-2xl font-bold text-gray-800">❗ Потрібний БЧС</h2>
                        <p className="max-w-xl text-gray-600 leading-relaxed">
                            Щоб створити <b>Донесення</b> або <b>Штатний звіт</b>, спочатку
                            імпортуйте або додайте БЧСу відповідному розділі.
                        </p>
                        <p className="text-sm text-gray-500 italic">
                            Після додавання посади ці таблиці будуть доступні автоматично.
                        </p>

                        {/* ✅ NOW this button will switch parent tab */}
                        <button
                            onClick={() => {
                                if (onRequestImportTab) onRequestImportTab();
                            }}
                            className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
                        >
                            ➕ Імпортувати або додати посади
                        </button>
                    </div>
                ) : (
                    <>
                        {/* {activeTable === 'combat' && (
                            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                                <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
                                    <h2 className="text-lg font-semibold text-gray-700">
                                        📄 ДОНЕСЕННЯ
                                    </h2>
                                    <span className="text-xs text-gray-500">
                                        Оновлено: {new Date().toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-center text-sm border-collapse">
                                        <CombatReportTable />
                                    </table>
                                </div>
                                <div className="p-4 border-t flex justify-end">
                                    <button
                                        onClick={generateCombatReportExcel}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                                    >
                                        📤 Експорт Combat Report (.xlsx)
                                    </button>
                                </div>
                            </div>
                        )} */}

                        {activeTable === 'alternate' && (
                            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                                <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
                                    <h2 className="text-lg font-semibold text-gray-700">
                                        📄 АЛЬТЕРНАТИВНИЙ ЗВІТ
                                    </h2>
                                    <span className="text-xs text-gray-500">
                                        Оновлено: {new Date().toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-center text-sm border-collapse">
                                        <AlternateCombatReportTable />
                                    </table>
                                </div>
                                <div className="p-4 border-t flex justify-end">
                                    <button
                                        onClick={() =>
                                            generateAlternateCombatReportExcelTemplate(report)
                                        }
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                                    >
                                        📤 Експорт Alternate Report (.xlsx)
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTable === 'staff' && (
                            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                                <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
                                    <h2 className="text-lg font-semibold text-gray-700">
                                        📄 Штатний звіт
                                    </h2>
                                    <span className="text-xs text-gray-500">
                                        Оновлено: {new Date().toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="p-4 border-t flex justify-end">
                                    <button
                                        onClick={generateStaffReportExcel}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                                    >
                                        📤 Експорт Staff Report (.xlsx)
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-center text-sm border-collapse">
                                        <StaffReportTable />
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
