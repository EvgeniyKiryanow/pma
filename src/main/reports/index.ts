import { defineModule, type ModuleContext } from '../app/module';
import { AppPaths } from '../core/paths';
import { fileCipher } from '../security';
import { BundledTemplateCatalog } from './BundledTemplateCatalog';
import { DocxPdfConverter } from './DocxPdfConverter';
import { registerReportIpc } from './ipc';
import { ReportFileStore } from './ReportFileStore';
import { ReportTemplateRepository } from './ReportTemplateRepository';
import { ReportTemplateService } from './ReportTemplateService';
import { TemplateInstaller } from './TemplateInstaller';

export function createReportsModule(context: ModuleContext) {
    const templates = new ReportTemplateService(
        context.transactor,
        new ReportTemplateRepository(context.db),
        new ReportFileStore(() => AppPaths.reports, fileCipher),
        context.journal,
    );
    const bundled = new BundledTemplateCatalog(() => AppPaths.bundledTemplates);
    const pdf = new DocxPdfConverter(() => AppPaths.staging);
    const installer = new TemplateInstaller(context.createLogger('templates'));

    return defineModule({
        name: 'reports',
        templates,
        installer,
        registerIpc: () => registerReportIpc({ templates, bundled, pdf }),
    });
}
