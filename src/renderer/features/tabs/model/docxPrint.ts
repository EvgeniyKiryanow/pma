import { renderAsync } from 'docx-preview';

import { printReport } from '../../../shared/lib/printReport';

/**
 * A generated DOCX as PDF or on paper, without Word or LibreOffice: drawn page by page
 * outside the visible window, then printed as it is (the document keeps its own margins).
 */
export async function printDocx(
    buffer: ArrayBuffer,
    title: string,
    mode: 'print' | 'pdf',
): Promise<void> {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-20000px;top:0;width:1000px;background:#fff';
    document.body.appendChild(host);
    try {
        await renderAsync(buffer, host, undefined, {
            inWrapper: false,
            breakPages: true,
            ignoreLastRenderedPageBreak: true,
        });
        // The pages without the hiding position of the host (it would move them off the sheet).
        const pages = document.createElement('div');
        pages.innerHTML = host.innerHTML;
        await printReport(pages, title, mode, { document: true });
    } finally {
        host.remove();
    }
}
