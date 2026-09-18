import { defineModule, type ModuleContext } from '../app/module';
import { DirectiveRepository } from './DirectiveRepository';
import { DirectiveService } from './DirectiveService';
import { registerDirectiveIpc } from './ipc';

export function createDirectivesModule(context: ModuleContext) {
    const service = new DirectiveService(
        context.transactor,
        new DirectiveRepository(context.db),
        context.journal,
    );
    return defineModule({
        name: 'directives',
        service,
        registerIpc: () => registerDirectiveIpc(service),
    });
}
