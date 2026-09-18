import { renderAsync } from 'docx-preview';
import { FileText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Modal } from '../../../../shared/ui';

type Props = {
    open: boolean;
    title: string;
    /** The document to show (a template with its placeholders, or a generated report). */
    load: () => Promise<ArrayBuffer>;
    onClose: () => void;
};

/** A DOCX drawn in the window (no Word, no LibreOffice); placeholders show as written. */
export default function DocxPreviewModal({ open, title, load, onClose }: Props) {
    const container = useRef<HTMLDivElement>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setState('loading');
        void (async () => {
            try {
                const content = await load();
                if (cancelled || !container.current) return;
                container.current.innerHTML = '';
                await renderAsync(content, container.current);
                if (!cancelled) setState('ready');
            } catch (err) {
                console.error('Failed to render preview:', err);
                if (!cancelled) setState('failed');
            }
        })();
        return () => {
            cancelled = true;
        };
        // `load` changes with every render of the parent; the document is the same.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, title]);

    if (!open) return null;

    return (
        <Modal
            open
            onClose={onClose}
            title={title}
            description="Попередній перегляд: відступи та шрифти можуть трохи відрізнятися від Word."
            icon={<FileText />}
            width="max-w-4xl"
            bodyClassName="bg-surface-2 p-4"
        >
            {state === 'loading' && <p className="text-sm text-ink-3">Завантаження…</p>}
            {state === 'failed' && (
                <p className="text-sm text-danger-ink">Не вдалося відобразити документ.</p>
            )}
            <div ref={container} className="overflow-auto rounded-lg text-sm" />
        </Modal>
    );
}
