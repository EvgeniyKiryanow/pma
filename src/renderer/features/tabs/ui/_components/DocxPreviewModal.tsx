import { renderAsync } from 'docx-preview';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { useEffect } from 'react';

type Props = {
    open: boolean;
    template: any;
    onClose: () => void;
};

export default function DocxPreviewModal({ open, template, onClose }: Props) {
    useEffect(() => {
        if (!open || !template?.content) return;

        const container = document.getElementById('docx-preview-container');
        if (!container) return;

        container.innerHTML = 'Loading preview...';

        try {
            const zip = new PizZip(template.content);
            const doc = new Docxtemplater(zip);
            doc.render();
            const buffer = doc.getZip().generate({ type: 'arraybuffer' });

            renderAsync(buffer, container);
        } catch (err) {
            console.error('❌ Failed to render preview:', err);
            container.innerHTML = '⚠️ Не вдалося відобразити шаблон.';
        }
    }, [open, template]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white shadow-xl rounded-lg max-w-4xl w-full mx-4 relative overflow-hidden animate-fade-in">
                <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-100">
                    <div>
                        <h3 className="text-lg font-medium text-gray-800 mb-1">
                            Попередній перегляд:{' '}
                            <span className="font-semibold">{template?.name}</span>
                        </h3>
                        <p className="text-sm text-gray-500">
                            ⚠️ Увага: Це лише приблизний попередній перегляд. Відображення, стилі та
                            відступи можуть відрізнятись від фінального документа.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                    >
                        &times;
                    </button>
                </div>
                <div
                    id="docx-preview-container"
                    className="p-4 overflow-auto max-h-[75vh] bg-white text-sm"
                >
                    <p className="text-gray-500">⏳ Завантаження...</p>
                </div>
            </div>
        </div>
    );
}

// <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
//     <div className="bg-white shadow-xl rounded-lg max-w-4xl w-full mx-4 relative overflow-hidden animate-fade-in">
//         <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-100">
//             <h3 className="text-lg font-medium text-gray-800 mb-1">
//                 Попередній перегляд:{' '}
//                 <span className="font-semibold">{previewTpl?.name}</span>
//             </h3>
//             <p className="text-sm text-gray-500 mb-3">
//                 ⚠️ Увага: Це лише приблизний попередній перегляд. Відображення,
//                 стилі та відступи відрізняються від фінального документу.
//             </p>
//             <button
//                 onClick={() => setShowPreview(false)}
//                 className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
//             >
//                 &times;
//             </button>
//         </div>
//         <div
//             id="docx-preview-container"
//             className="p-4 overflow-auto max-h-[75vh] bg-white text-sm"
//         >
//             <p className="text-gray-500">⏳ Завантаження...</p>
//         </div>
//     </div>
// </div>
