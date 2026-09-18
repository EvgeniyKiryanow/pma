import { renderAsync } from 'docx-preview';
import Docxtemplater from 'docxtemplater';
import { FileText } from 'lucide-react';
import PizZip from 'pizzip';
import { useEffect } from 'react';

import { Modal } from '../../../../shared/ui';

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

        container.innerHTML = 'Завантаження…';

        try {
            const zip = new PizZip(template.content);
            const doc = new Docxtemplater(zip);
            doc.render();
            const buffer = doc.getZip().generate({ type: 'arraybuffer' });

            container.innerHTML = '';
            void renderAsync(buffer, container);
        } catch (err) {
            console.error('Failed to render preview:', err);
            container.innerHTML = 'Не вдалося відобразити шаблон.';
        }
    }, [open, template]);

    if (!open) return null;

    return (
        <Modal
            open
            onClose={onClose}
            title={template?.name ?? 'Шаблон'}
            description="Приблизний попередній перегляд: відступи та стилі можуть відрізнятися від фінального документа."
            icon={<FileText />}
            width="max-w-4xl"
            bodyClassName="bg-surface-2 p-4"
        >
            <div id="docx-preview-container" className="overflow-auto rounded-lg text-sm" />
        </Modal>
    );
}
