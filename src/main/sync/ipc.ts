import { SYNC_CHANNELS } from '../../shared/ipc/channels';
import { chooseOpenFile, chooseSavePath } from '../core/dialogs';
import { access, handle } from '../ipc/secureHandle';
import type { ChangeExchangeService } from './ChangeExchangeService';

const CHANGE_LOG_FILTER = { name: 'Журнал змін', extensions: ['pmc'] };

export function registerSyncIpc(exchange: ChangeExchangeService): void {
    handle(
        SYNC_CHANNELS.exportChanges,
        access.any('sync.export'),
        (event, password: unknown) =>
            exchange.exportChanges(String(password ?? ''), () =>
                chooseSavePath(event.sender, {
                    title: 'Експорт журналу змін',
                    defaultPath: 'change_log.pmc',
                    filters: [CHANGE_LOG_FILTER],
                }),
            ),
        { audit: 'sync.export' },
    );

    handle(
        SYNC_CHANNELS.importChanges,
        access.any('sync.import'),
        (event, password: unknown) =>
            exchange.importChanges(String(password ?? ''), () =>
                chooseOpenFile(event.sender, {
                    title: 'Імпорт журналу змін',
                    filters: [CHANGE_LOG_FILTER],
                }),
            ),
        { audit: 'sync.import' },
    );
}
