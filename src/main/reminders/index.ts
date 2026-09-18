import { defineModule, type ModuleContext } from '../app/module';
import { registerReminderIpc } from './ipc';
import { ReminderRepository } from './ReminderRepository';
import { ReminderService } from './ReminderService';

export function createRemindersModule(context: ModuleContext) {
    const service = new ReminderService(new ReminderRepository(context.db));
    return defineModule({
        name: 'reminders',
        service,
        registerIpc: () => registerReminderIpc(service),
    });
}
