import { BrowserWindow, type WebContents } from 'electron';

import type { PrintableDocument } from '../../shared/types/files';

/** A4 landscape or portrait with narrow margins; colours of the form are kept. */
function pageCss(landscape: boolean): string {
    return `
@page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 8mm; }
html, body { background: #fff !important; color: #000; margin: 0; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: Arial, sans-serif; }
.print-title { font-size: 14px; font-weight: 600; margin: 0 0 8px; }
button { border: 0; background: none; font: inherit; color: inherit; padding: 0; }
`;
}

function escapeHtml(text: string): string {
    return text.replace(
        /[&<>"]/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!,
    );
}

/**
 * The page that is printed: the report as the window shows it, the app's styles, no scripts
 * (the content security policy and the window both forbid them) and no network.
 */
export function documentHtml(doc: PrintableDocument): string {
    // A style sheet must not be able to close its own <style> element.
    const css = doc.css.replace(/<\/style/gi, '<\\/style');
    return [
        '<!doctype html>',
        '<html lang="uk" data-theme="light">',
        '<head><meta charset="utf-8">',
        `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:">`,
        `<title>${escapeHtml(doc.title)}</title>`,
        `<style>${css}</style><style>${pageCss(doc.landscape)}</style>`,
        '</head><body>',
        `<p class="print-title">${escapeHtml(doc.title)}</p>`,
        doc.html,
        '</body></html>',
    ].join('');
}

const clampScale = (scale: number) => Math.min(1, Math.max(0.1, scale));

/**
 * Prints or makes a PDF of a report without LibreOffice: Chromium renders the page in a
 * hidden window. The window lives in an in-memory session (nothing cached on disk), runs no
 * scripts and is destroyed right after.
 */
export class DocumentPrinter {
    private async withPage<T>(
        doc: PrintableDocument,
        work: (page: WebContents) => Promise<T>,
    ): Promise<T> {
        const window = new BrowserWindow({
            show: false,
            width: 1400,
            height: 1000,
            webPreferences: {
                javascript: false,
                sandbox: true,
                contextIsolation: true,
                nodeIntegration: false,
                spellcheck: false,
                partition: 'pmanager-print',
            },
        });
        try {
            await window.loadURL(
                `data:text/html;charset=utf-8,${encodeURIComponent(documentHtml(doc))}`,
            );
            return await work(window.webContents);
        } finally {
            if (!window.isDestroyed()) window.destroy();
        }
    }

    pdf(doc: PrintableDocument): Promise<Buffer> {
        return this.withPage(doc, (page) =>
            page.printToPDF({
                landscape: doc.landscape,
                pageSize: 'A4',
                printBackground: true,
                scale: clampScale(doc.scale),
                margins: { top: 0.3, bottom: 0.3, left: 0.3, right: 0.3 },
            }),
        );
    }

    /** The Windows print dialog; false when the person cancelled it. */
    print(doc: PrintableDocument): Promise<boolean> {
        return this.withPage(
            doc,
            (page) =>
                new Promise<boolean>((resolve, reject) =>
                    page.print(
                        {
                            silent: false,
                            printBackground: true,
                            landscape: doc.landscape,
                            pageSize: 'A4',
                            scaleFactor: Math.round(clampScale(doc.scale) * 100),
                        },
                        (success, reason) => {
                            if (success) resolve(true);
                            else if (/cancel/i.test(reason)) resolve(false);
                            else reject(new Error(`Printing failed: ${reason}`));
                        },
                    ),
                ),
        );
    }
}
