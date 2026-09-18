import {
    NAMED_LIST_CHANNELS,
    REMINDER_CHANNELS,
    REPORT_CHANNELS,
    STAFFING_CHANNELS,
} from '../../shared/ipc/channels';
import type { ActionStatus } from '../../shared/types/common';
import type { Reminder } from '../../shared/types/reminder';
import type {
    BundledReportTemplate,
    NamedListRecord,
    ReportTemplateRecord,
} from '../../shared/types/reports';
import type { ShtatnaPosada } from '../../shared/types/shtatnaPosada';
import { invoke } from '../invoke';

/** Staffing table (штатні посади). */
export const staffingApi = {
    fetchAll: () => invoke<ShtatnaPosada[]>(STAFFING_CHANNELS.list),
    import: (positions: ShtatnaPosada[]) =>
        invoke<{ success: boolean; added: number; skipped: number; total: number }>(
            STAFFING_CHANNELS.import,
            positions,
        ),
    update: (position: ShtatnaPosada) => invoke<ActionStatus>(STAFFING_CHANNELS.update, position),
    delete: (shtatNumber: string) => invoke<ActionStatus>(STAFFING_CHANNELS.remove, shtatNumber),
    deleteAll: () => invoke<{ success: boolean; deleted?: number }>(STAFFING_CHANNELS.removeAll),
};

/** DOCX templates and generated reports. Kept flat on the bridge. */
export const reportsApi = {
    getAllReportTemplates: () =>
        invoke<BundledReportTemplate[]>(REPORT_CHANNELS.listBundledTemplates),
    convertDocxToPdf: (buffer: ArrayBuffer, fileName: string) =>
        invoke<Uint8Array>(REPORT_CHANNELS.convertDocxToPdf, buffer, fileName),
    saveReportFileToDisk: (buffer: ArrayBuffer, name: string) =>
        invoke<string>(REPORT_CHANNELS.saveFile, buffer, name),
    addReportTemplateToDb: (name: string, filePath: string) =>
        invoke<{ success: boolean }>(REPORT_CHANNELS.addTemplate, name, filePath),
    deleteReportTemplateFromDb: (id: number) =>
        invoke<ActionStatus>(REPORT_CHANNELS.removeTemplate, id),
    getReportTemplatesFromDb: () => invoke<ReportTemplateRecord[]>(REPORT_CHANNELS.listTemplates),
    readReportFileBuffer: (filePath: string) =>
        invoke<ArrayBuffer>(REPORT_CHANNELS.readFile, filePath),
};

/** Monthly named list (табель). */
export const namedListApi = {
    create: (key: string, data: any) => invoke<ActionStatus>(NAMED_LIST_CHANNELS.create, key, data),
    updateCell: (key: string, rowId: number, dayIndex: number, value: string) =>
        invoke<ActionStatus>(NAMED_LIST_CHANNELS.updateCell, key, rowId, dayIndex, value),
    getAll: () => invoke<NamedListRecord[]>(NAMED_LIST_CHANNELS.list),
    delete: (key: string) => invoke<ActionStatus>(NAMED_LIST_CHANNELS.remove, key),
};

export const remindersApi = {
    getTodos: () => invoke<Reminder[]>(REMINDER_CHANNELS.list),
    addTodo: (content: string) => invoke<Reminder>(REMINDER_CHANNELS.add, content),
    toggleTodo: (id: number) => invoke<Reminder>(REMINDER_CHANNELS.toggle, id),
    deleteTodo: (id: number) => invoke<boolean>(REMINDER_CHANNELS.remove, id),
};
