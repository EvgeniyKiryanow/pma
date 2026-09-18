import { defineModule, type ModuleContext } from '../app/module';
import { registerNamedListIpc } from './ipc';
import { NamedListRepository } from './NamedListRepository';
import { NamedListService } from './NamedListService';

export function createNamedListModule(context: ModuleContext) {
    const service = new NamedListService(
        context.transactor,
        new NamedListRepository(context.db),
        context.journal,
    );
    return defineModule({
        name: 'named-list',
        service,
        registerIpc: () => registerNamedListIpc(service),
    });
}
