// src/components/ExcelTemplates/ExcelTemplateCard.tsx
import React from 'react';
import { FileSpreadsheet } from 'lucide-react';

type Props = {
    title: string;
    description?: string;
    onExport: () => void;
};

export default function ExcelTemplateCard({ title, description, onExport }: Props) {
    return (
        <div className="flex flex-col gap-2 p-4 border rounded-lg shadow-sm bg-white hover:shadow-md transition">
            <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-green-600 w-5 h-5" />
                <h3 className="font-semibold text-gray-800">{title}</h3>
            </div>
            {description && <p className="text-sm text-gray-500 leading-snug">{description}</p>}
            <button
                onClick={onExport}
                className="self-start px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition"
            >
                📤 Експорт Excel
            </button>
        </div>
    );
}
