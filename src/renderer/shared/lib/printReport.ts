import { ApiError } from '../api/call';
import { reportError } from '../api/errors';
import { filesApi } from '../api/files';
import { toast } from '../ui/toast';

/** Printable width of A4 landscape with 8 mm margins, in CSS pixels (96 per inch). */
const PAGE_WIDTH_PX = Math.floor(((297 - 16) / 25.4) * 96);

/** The app's style rules, so the printed report looks as it does on the screen. */
function collectCss(): string {
    const rules: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            for (const rule of Array.from(sheet.cssRules)) rules.push(rule.cssText);
        } catch {
            // a sheet the page may not read: its rules are left out
        }
    }
    return rules.join('\n');
}

/**
 * Prints a report (Windows print dialog) or saves it as PDF — rendered by the app itself, so
 * no LibreOffice or other program is needed. A report wider than the page is shrunk to fit.
 */
export async function printReport(
    element: HTMLElement,
    title: string,
    mode: 'print' | 'pdf',
): Promise<void> {
    const document = {
        title,
        html: element.outerHTML,
        css: collectCss(),
        landscape: true,
        scale: Math.min(1, Math.max(0.1, PAGE_WIDTH_PX / Math.max(1, element.scrollWidth))),
    };
    try {
        if (mode === 'print') {
            await filesApi.print(document);
            return;
        }
        const saved = await filesApi.savePdf(document);
        if (saved.saved) toast.success(`PDF збережено: ${saved.fileName}`);
    } catch (err) {
        if (err instanceof ApiError && err.code === 'CANCELED') return;
        reportError(err, { context: `report-${mode}` });
    }
}
