import { defineModule, type ModuleContext } from '../app/module';
import { registerSettingsIpc } from './ipc';
import { SettingsRepository } from './SettingsRepository';
import { SettingsService } from './SettingsService';

/** Settings stored with the data (security policy, unit details for documents). */
export function createSettingsModule(context: ModuleContext) {
    const settings = new SettingsService(new SettingsRepository(context.db));
    return defineModule({
        name: 'settings',
        settings,
        registerIpc: () => registerSettingsIpc(settings),
    });
}
