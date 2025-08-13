// components/_components/SavedTemplatesList.tsx
import { CheckCircle } from 'lucide-react';

// import type { Template } from '../../../types/template';
import { useReportsStore } from '../../../report/model/reportsStore';

type Props = {
    templates: any[];
    selectedTemplateId: string | number;
    searchQuery: string;
    handlePreview: (tpl: any) => void;
};

export default function SavedTemplatesList({
    templates,
    selectedTemplateId,
    searchQuery,
    handlePreview,
}: Props) {
    const setSelectedTemplate = useReportsStore((s) => s.setSelectedTemplate);
    const filteredTemplates = templates.filter((tpl) =>
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    if (filteredTemplates.length === 0) {
        return <p className="text-gray-500 text-sm">Немає збережених шаблонів</p>;
    }

    return (
        <div className="mb-6">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((tpl) => (
                    <li
                        key={tpl.id || Date.now()}
                        className={`p-4 rounded-lg shadow-sm border transition flex flex-col gap-3 cursor-pointer ${
                            selectedTemplateId === tpl.id
                                ? 'bg-blue-50 border-blue-400'
                                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                        }`}
                    >
                        <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                                <div className="font-semibold text-base text-gray-800 flex items-center gap-1">
                                    📁 {tpl.name}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {new Date(tpl.timestamp).toLocaleString()}
                                </div>
                            </div>
                            {selectedTemplateId === tpl.id && (
                                <CheckCircle className="text-green-600 w-5 h-5 shrink-0 mt-1" />
                            )}
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => handlePreview(tpl)}
                                className="px-3 py-1 text-sm font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition"
                            >
                                🔍 Попередній перегляд
                            </button>
                            <button
                                onClick={() =>
                                    setSelectedTemplate(
                                        selectedTemplateId === tpl.id ? null : tpl.id,
                                    )
                                }
                                className="px-3 py-1 text-sm font-medium text-gray-700 border border-gray-200 rounded hover:bg-gray-100 transition"
                            >
                                ✅ Обрати
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// <div className="mb-6">
//     <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         {savedTemplates
//             .filter((tpl: any) =>
//                 tpl.name.toLowerCase().includes(searchQuery.toLowerCase()),
//             )
//             .map((tpl: any) => (
//                 <li
//                     key={tpl.id || Date.now()}
//                     className={`p-4 rounded-lg shadow-sm border transition flex flex-col gap-3 cursor-pointer ${
//                         selectedTemplateId === tpl.id
//                             ? 'bg-blue-50 border-blue-400'
//                             : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
//                     }`}
//                 >
//                     <div className="flex justify-between items-start gap-3">
//                         <div className="flex-1">
//                             <div className="font-semibold text-base text-gray-800 flex items-center gap-1">
//                                 📁 {tpl.name}
//                             </div>
//                             <div className="text-xs text-gray-500 mt-1">
//                                 {new Date(tpl.timestamp).toLocaleString()}
//                             </div>
//                         </div>
//                         {selectedTemplateId === tpl.id && (
//                             <CheckCircle className="text-green-600 w-5 h-5 shrink-0 mt-1" />
//                         )}
//                     </div>
//                     <div className="flex gap-2 justify-end">
//                         <button
//                             onClick={() => handlePreview(tpl)}
//                             className="px-3 py-1 text-sm font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition"
//                         >
//                             🔍 Попередній перегляд
//                         </button>
//                         <button
//                             onClick={() =>
//                                 setSelectedTemplate(
//                                     selectedTemplateId === tpl.id
//                                         ? null
//                                         : tpl.id,
//                                 )
//                             }
//                             className="px-3 py-1 text-sm font-medium text-gray-700 border border-gray-200 rounded hover:bg-gray-100 transition"
//                         >
//                             ✅ Обрати
//                         </button>
//                     </div>
//                 </li>
//             ))}
//     </ul>
// </div>
