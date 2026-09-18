import { defineModule, type ModuleContext } from '../app/module';
import { registerSystemIpc } from './ipc';

export function createSystemModule(context: ModuleContext) {
    const logger = context.createLogger('app');
    return defineModule({
        name: 'system',
        registerIpc: () => registerSystemIpc(logger),
    });
}
