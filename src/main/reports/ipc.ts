import { REPORT_CHANNELS } from '../../shared/ipc/channels';
import { safeFileName } from '../core/paths';
import { toStatus } from '../ipc/legacy';
import { access, handle } from '../ipc/secureHandle';
import { requireBuffer, requireInt, requireString } from '../ipc/validate';
import type { BundledTemplateCatalog } from './BundledTemplateCatalog';
import type { DocxPdfConverter } from './DocxPdfConverter';
import type { ReportTemplateService } from './ReportTemplateService';

const MAX_DOCUMENT_BYTES = 100 * 1024 * 1024;

type Deps = {
    templates: ReportTemplateService;
    bundled: BundledTemplateCatalog;
    pdf: DocxPdfConverter;
};

export function registerReportIpc({ templates, bundled, pdf }: Deps): void {
    const view = access.any('reports.view');
    const manage = access.any('reports.templates');

    handle(REPORT_CHANNELS.listBundledTemplates, view, () => bundled.list());

    handle(REPORT_CHANNELS.convertDocxToPdf, view, (_event, buffer: unknown, fileName: unknown) =>
        pdf.convert(
            requireBuffer(buffer, 'buffer', { maxBytes: MAX_DOCUMENT_BYTES }),
            requireString(fileName, 'fileName', { maxLength: 200 }),
        ),
    );

    handle(REPORT_CHANNELS.listTemplates, view, () => templates.list());

    handle(REPORT_CHANNELS.readFile, view, (_event, filePath: unknown) =>
        templates.readFile(requireString(filePath, 'filePath', { maxLength: 400 })),
    );

    handle(
        REPORT_CHANNELS.saveFile,
        manage,
        (_event, buffer: unknown, name: unknown) =>
            templates.saveFile(
                requireString(name, 'name', { maxLength: 200 }),
                requireBuffer(buffer, 'buffer', { maxBytes: MAX_DOCUMENT_BYTES }),
            ),
        { audit: 'reports.upload-template' },
    );

    handle(
        REPORT_CHANNELS.addTemplate,
        manage,
        async (_event, name: unknown, filePath: unknown) => {
            await templates.add(
                requireString(name, 'name', { maxLength: 200 }),
                safeFileName(requireString(filePath, 'filePath', { maxLength: 200 })),
            );
            return { success: true };
        },
        { audit: 'reports.add-template' },
    );

    handle(
        REPORT_CHANNELS.removeTemplate,
        manage,
        (_event, id: unknown) => {
            const templateId = requireInt(id, 'id');
            return toStatus(() => templates.remove(templateId));
        },
        { audit: 'reports.delete-template' },
    );
}
