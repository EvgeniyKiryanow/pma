import type { CommentOrHistoryEntry } from '../../shared/types/user';
import { defineModule, type ModuleContext } from '../app/module';
import { AppPaths } from '../core/paths';
import { fileCipher } from '../security';
import { CommentService } from './CommentService';
import { EntryListStore } from './EntryListStore';
import { HistoryAttachments } from './HistoryAttachments';
import { HistoryIndexRepository } from './HistoryIndexRepository';
import { HistoryService } from './HistoryService';
import { registerCommentIpc, registerHistoryIpc, registerPersonnelIpc } from './ipc';
import { shrinkWithNativeImage } from './nativePhotoShrinker';
import { PersonnelRepository } from './PersonnelRepository';
import { PersonnelService } from './PersonnelService';
import { PhotoThumbnails } from './PhotoThumbnails';

/** Personnel records with their history (and attachments) and comments. */
export function createPersonnelModule(context: ModuleContext) {
    const { transactor, journal } = context;
    const logger = context.createLogger('personnel');
    const people = new PersonnelRepository(context.db);

    const attachments = new HistoryAttachments(() => AppPaths.historyFiles, logger, fileCipher);
    const personnel = new PersonnelService(transactor, people, journal, attachments);
    const history = new HistoryService(
        transactor,
        new EntryListStore<CommentOrHistoryEntry>(people, journal, 'history'),
        attachments,
        new HistoryIndexRepository(context.db),
    );
    const comments = new CommentService(
        transactor,
        new EntryListStore<CommentOrHistoryEntry>(people, journal, 'comments'),
    );

    const photos = new PhotoThumbnails(people, shrinkWithNativeImage, logger);

    return defineModule({
        name: 'personnel',
        personnel,
        photos,
        attachments,
        history,
        comments,
        registerIpc: () => {
            registerPersonnelIpc(personnel, logger);
            registerHistoryIpc(history);
            registerCommentIpc(comments);
        },
    });
}
