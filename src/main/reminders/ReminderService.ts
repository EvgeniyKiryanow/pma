import type { Reminder } from '../../shared/types/reminder';
import type { ReminderRepository } from './ReminderRepository';

/** Personal reminders (todos). Not part of the change log: they are local notes. */
export class ReminderService {
    constructor(private readonly reminders: ReminderRepository) {}

    list(): Promise<Reminder[]> {
        return this.reminders.list();
    }

    async add(content: string): Promise<Reminder | undefined> {
        return this.reminders.findById(await this.reminders.insert(content));
    }

    async toggle(id: number): Promise<Reminder | undefined> {
        await this.reminders.toggle(id);
        return this.reminders.findById(id);
    }

    async remove(id: number): Promise<true> {
        await this.reminders.delete(id);
        return true;
    }
}
