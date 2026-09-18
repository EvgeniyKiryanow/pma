import type { CommentOrHistoryEntry } from '../../shared/types/user';
import { defineModule, type ModuleContext } from '../app/module';
import { AppPaths } from '../core/paths';
import { CommentService } from './CommentService';
import { EntryListStore } from './EntryListStore';
import { HistoryAttachments } from './HistoryAttachments';
import { HistoryService } from './HistoryService';
import { registerCommentIpc, registerHistoryIpc, registerPersonnelIpc } from './ipc';
import { PersonnelRepository } from './PersonnelRepository';
import { PersonnelService } from './PersonnelService';

/** Personnel records with their history (and attachments) and comments. */
export function createPersonnelModule(context: ModuleContext) {
    const { transactor, journal } = context;
    const logger = context.createLogger('personnel');
    const people = new PersonnelRepository(context.db);

    const personnel = new PersonnelService(transactor, people, journal);
    const history = new HistoryService(
        transactor,
        new EntryListStore<CommentOrHistoryEntry>(people, journal, 'history'),
        new HistoryAttachments(() => AppPaths.historyFiles, logger),
    );
    const comments = new CommentService(
        transactor,
        new EntryListStore<CommentOrHistoryEntry>(people, journal, 'comments'),
    );

    return defineModule({
        name: 'personnel',
        personnel,
        history,
        comments,
        registerIpc: () => {
            registerPersonnelIpc(personnel, logger);
            registerHistoryIpc(history);
            registerCommentIpc(comments);
        },
    });
}
