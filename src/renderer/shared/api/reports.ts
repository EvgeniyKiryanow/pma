import type { Reminder } from '../../../shared/types/reminder';
import type {
    BundledReportTemplate,
    NamedListRecord,
    ReportFileKind,
    ReportTemplateRecord,
} from '../../../shared/types/reports';
import type { ShtatnaPosada } from '../../../shared/types/shtatnaPosada';
import { bridge, call, expectSuccess } from './bridge';

/** Staffing table (штатні посади, БЧС). */
export const staffingApi = {
    list: (): Promise<ShtatnaPosada[]> => call(bridge().shtatni.fetchAll()),
    /** Adds new positions; numbers that already exist are skipped. */
    import: async (positions: ShtatnaPosada[]) => {
        const { added, skipped, total } = await expectSuccess(
            bridge().shtatni.import(positions),
            'INTERNAL',
        );
        return { added, skipped, total };
    },
    update: async (position: ShtatnaPosada): Promise<void> => {
        await expectSuccess(bridge().shtatni.update(position), 'NOT_FOUND');
    },
    remove: async (shtatNumber: string): Promise<void> => {
        await expectSuccess(bridge().shtatni.delete(shtatNumber), 'NOT_FOUND');
    },
    /** Returns how many positions were deleted. */
    removeAll: async (): Promise<number> =>
        (await expectSuccess(bridge().shtatni.deleteAll(), 'INTERNAL')).deleted ?? 0,
};

/** DOCX templates: the bundled ones and those uploaded by users. */
export const reportTemplatesApi = {
    listBundled: (): Promise<BundledReportTemplate[]> => call(bridge().getAllReportTemplates()),
    listUploaded: (): Promise<ReportTemplateRecord[]> => call(bridge().getReportTemplatesFromDb()),
    /**
     * Saves the file in the reports folder (it travels with backups) and registers it as a
     * template or a saved report; returns the stored file name.
     */
    upload: async (file: File, kind: ReportFileKind = 'report'): Promise<string> => {
        const fileName = await call(
            bridge().saveReportFileToDisk(await file.arrayBuffer(), file.name),
        );
        await expectSuccess(bridge().addReportTemplateToDb(file.name, fileName, kind), 'INTERNAL');
        return fileName;
    },
    remove: async (id: number): Promise<void> => {
        await expectSuccess(bridge().deleteReportTemplateFromDb(id), 'NOT_FOUND');
    },
    readFile: (fileName: string): Promise<ArrayBuffer> =>
        call(bridge().readReportFileBuffer(fileName)),
    /** PDF preview through LibreOffice (when installed); returns the PDF content. */
    convertToPdf: (content: ArrayBuffer, fileName: string): Promise<Uint8Array> =>
        call(bridge().convertDocxToPdf(content, fileName)),
};

/** Monthly named list (табель). */
export const namedListApi = {
    list: (): Promise<NamedListRecord[]> => call(bridge().namedList.getAll()),
    create: async (key: string, rows: unknown[]): Promise<void> => {
        await expectSuccess(bridge().namedList.create(key, rows), 'CONFLICT');
    },
    updateCell: async (key: string, rowId: number, dayIndex: number, value: string) => {
        await expectSuccess(
            bridge().namedList.updateCell(key, rowId, dayIndex, value),
            'NOT_FOUND',
        );
    },
    remove: async (key: string): Promise<void> => {
        await expectSuccess(bridge().namedList.delete(key), 'NOT_FOUND');
    },
};

export const remindersApi = {
    list: (): Promise<Reminder[]> => call(bridge().getTodos()),
    add: (content: string): Promise<Reminder> => call(bridge().addTodo(content)),
    toggle: (id: number): Promise<Reminder> => call(bridge().toggleTodo(id)),
    remove: async (id: number): Promise<void> => {
        await call(bridge().deleteTodo(id));
    },
};
