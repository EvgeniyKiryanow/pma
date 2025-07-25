import React from 'react';
import { CombatReportTable } from './_components/CombatReportTable';

export default function GeneratedTablesTabContent() {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">📑 Згенеровані таблиці</h1>
            <p className="text-gray-600 mb-6">
                Тут буде список таблиць, згенерованих після імпорту чи інших операцій.
            </p>

            <div className="overflow-x-auto rounded-lg">
                <table className="min-w-full text-center text-sm text-gray-900 border-collapse border border-black">
                    <CombatReportTable />
                </table>
            </div>
        </div>
    );
}
