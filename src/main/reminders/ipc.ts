import { REMINDER_CHANNELS } from '../../shared/ipc/channels';
import { access, handle } from '../ipc/secureHandle';
import { requireInt, requireString } from '../ipc/validate';
import type { ReminderService } from './ReminderService';

export function registerReminderIpc(reminders: ReminderService): void {
    const rule = access.authenticated;

    handle(REMINDER_CHANNELS.list, rule, () => reminders.list());
    handle(REMINDER_CHANNELS.add, rule, (_event, content: unknown) =>
        reminders.add(requireString(content, 'content', { maxLength: 2000 })),
    );
    handle(REMINDER_CHANNELS.toggle, rule, (_event, id: unknown) =>
        reminders.toggle(requireInt(id, 'id')),
    );
    handle(REMINDER_CHANNELS.remove, rule, (_event, id: unknown) =>
        reminders.remove(requireInt(id, 'id')),
    );
}
