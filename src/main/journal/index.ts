import { JOURNAL_CHANNELS } from '../../shared/ipc/channels';
import type { JournalEntryInput } from '../../shared/types/journal';
import { defineModule, type ModuleContext } from '../app/module';
import { access, handleResult } from '../ipc/secureHandle';
import { requireObject, requireString } from '../ipc/validate';
import type { HistoryAttachments } from '../personnel/HistoryAttachments';
import { JournalService } from './JournalService';

const uuidOf = (value: unknown) => requireString(value, 'uuid', { maxLength: 64 });

/** The working journal: notes and tasks with dates, priorities, categories and files. */
export function createJournalModule(context: ModuleContext, deps: { files: HistoryAttachments }) {
    const journal = new JournalService(context.transactor, context.db, deps.files, context.journal);
    const rule = access.authenticated;

    return defineModule({
        name: 'journal',
        journal,
        registerIpc: () => {
            handleResult(JOURNAL_CHANNELS.list, rule, () => journal.list());
            handleResult(
                JOURNAL_CHANNELS.save,
                rule,
                (_event, input: unknown) =>
                    journal.save(requireObject(input, 'entry') as unknown as JournalEntryInput),
                { audit: 'journal.save' },
            );
            handleResult(JOURNAL_CHANNELS.setDone, rule, (_event, uuid: unknown, done: unknown) =>
                journal.setDone(uuidOf(uuid), Boolean(done)),
            );
            handleResult(
                JOURNAL_CHANNELS.setPinned,
                rule,
                (_event, uuid: unknown, pinned: unknown) =>
                    journal.setPinned(uuidOf(uuid), Boolean(pinned)),
            );
            handleResult(
                JOURNAL_CHANNELS.remove,
                rule,
                (_event, uuid: unknown) => journal.remove(uuidOf(uuid)),
                { audit: 'journal.remove' },
            );
            handleResult(JOURNAL_CHANNELS.loadFile, rule, (_event, uuid: unknown, name: unknown) =>
                journal.loadFile(uuidOf(uuid), requireString(name, 'fileName', { maxLength: 260 })),
            );
        },
    });
}
