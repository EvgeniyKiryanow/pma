import type { DirectiveRecord } from '../../../../shared/types/directive';
import type { StatusPeriodEntry } from '../../../../shared/types/history';
import type { JournalEntry } from '../../../../shared/types/journal';
import type { User } from '../../../../shared/types/user';
import { localDate } from '../../report/model/namedListDays';

/**
 * «Найближчі дати» of the desktop: statuses and orders that end (СЗЧ, відпустка, шпиталь,
 * ВЛК…), birthdays, and journal entries with a date. All in local calendar days.
 */

export type UpcomingKind = 'status-end' | 'order-end' | 'birthday' | 'journal';

export type UpcomingEvent = {
    key: string;
    kind: UpcomingKind;
    date: Date;
    /** Negative: already past (an end that nobody closed yet). */
    daysLeft: number;
    title: string;
    /** Status, order title, age… */
    detail?: string;
    age?: number;
    userId?: number;
    journalUuid?: string;
};

const DAY = 24 * 60 * 60 * 1000;

export const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const daysBetween = (from: Date, to: Date) =>
    Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY);

const serving = (user: User) =>
    user.shpkNumber !== 'excluded' && !String(user.shpkNumber ?? '').includes('order');

export type UpcomingOptions = {
    today?: Date;
    /** Days ahead to look (default 14). */
    ahead?: number;
    /** Days back an unclosed end still shows (default 3). */
    behind?: number;
};

export function upcomingEvents(
    sources: {
        users: User[];
        periods?: StatusPeriodEntry[];
        orders?: DirectiveRecord[];
        journal?: JournalEntry[];
    },
    options: UpcomingOptions = {},
): UpcomingEvent[] {
    const today = startOfDay(options.today ?? new Date());
    const ahead = options.ahead ?? 14;
    const behind = options.behind ?? 3;
    const inWindow = (days: number) => days >= -behind && days <= ahead;
    const events: UpcomingEvent[] = [];
    const byId = new Map(sources.users.map((user) => [user.id, user]));

    // The end of the current status: the latest period of that status of the person.
    const latest = new Map<number, StatusPeriodEntry>();
    for (const period of sources.periods ?? []) {
        const user = byId.get(period.userId);
        if (!user || !period.to || period.status !== user.soldierStatus) continue;
        const known = latest.get(period.userId);
        if (!known || String(period.date).localeCompare(String(known.date)) > 0) {
            latest.set(period.userId, period);
        }
    }
    for (const [userId, period] of latest) {
        const end = localDate(period.to);
        const user = byId.get(userId)!;
        if (!end || !serving(user)) continue;
        const days = daysBetween(today, end);
        if (!inWindow(days)) continue;
        events.push({
            key: `status:${userId}:${period.entryId}`,
            kind: 'status-end',
            date: end,
            daysLeft: days,
            title: user.fullName,
            detail: period.status,
            userId,
        });
    }

    for (const order of sources.orders ?? []) {
        const user = byId.get(order.userId);
        const end = localDate(order.period?.to);
        if (!user || !end) continue;
        const days = daysBetween(today, end);
        if (!inWindow(days)) continue;
        events.push({
            key: `order:${order.id}`,
            kind: 'order-end',
            date: end,
            daysLeft: days,
            title: user.fullName,
            detail: order.title,
            userId: user.id,
        });
    }

    for (const user of sources.users) {
        const born = localDate(user.dateOfBirth);
        if (!born || !serving(user)) continue;
        let next = new Date(today.getFullYear(), born.getMonth(), born.getDate());
        if (next < today) next = new Date(today.getFullYear() + 1, born.getMonth(), born.getDate());
        const days = daysBetween(today, next);
        if (days > ahead) continue;
        events.push({
            key: `birthday:${user.id}`,
            kind: 'birthday',
            date: next,
            daysLeft: days,
            title: user.fullName,
            age: next.getFullYear() - born.getFullYear(),
            userId: user.id,
        });
    }

    for (const entry of sources.journal ?? []) {
        if (entry.done) continue;
        const due = localDate(entry.dueDate);
        if (!due) continue;
        const days = daysBetween(today, due);
        // Overdue tasks stay until they are done.
        if (days > ahead) continue;
        events.push({
            key: `journal:${entry.uuid}`,
            kind: 'journal',
            date: due,
            daysLeft: days,
            title: entry.title,
            detail: entry.dueTime ?? undefined,
            journalUuid: entry.uuid,
        });
    }

    return events.sort((a, b) => a.daysLeft - b.daysLeft || a.title.localeCompare(b.title, 'uk'));
}

/** «сьогодні», «завтра», «через 3 дн.», «прострочено на 2 дн.» */
export function daysLeftText(
    days: number,
    t: (key: string, vars?: Record<string, unknown>) => string,
) {
    if (days < 0) return t('dashboard.days.overdue', { days: -days });
    if (days === 0) return t('dashboard.days.today');
    if (days === 1) return t('dashboard.days.tomorrow');
    return t('dashboard.days.inDays', { days });
}
