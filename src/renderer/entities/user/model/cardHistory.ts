import { awardTitle } from '../../../../shared/awards/catalog';
import { CARD, CARD_FIELDS } from '../../../../shared/personnel/cardSchema';
import type { AwardRecord, CommentOrHistoryEntry, User } from '../../../../shared/types/user';

/**
 * What saving an edited card writes into the person's history: a status change as its own
 * entry (the same kind the БЧС and the history window write, so reports and the named list
 * see it), a move between staff positions, and one entry listing everything else changed.
 */

type Translate = (key: string, vars?: Record<string, unknown>) => string;

const NO_STATUS = 'Без статусу';

function entry(
    type: CommentOrHistoryEntry['type'],
    description: string,
    extra: Partial<CommentOrHistoryEntry> = {},
): CommentOrHistoryEntry {
    return {
        id: Date.now() + Math.floor(Math.random() * 1000),
        date: new Date().toISOString(),
        type,
        author: 'System',
        description,
        content: description,
        files: [],
        ...extra,
    };
}

const text = (value: unknown): string =>
    value === null || value === undefined || value === false
        ? ''
        : value === true
          ? '✓'
          : String(value).replace(/\s+/g, ' ').trim();

export function statusChangeEntry(
    before: Partial<User>,
    after: Partial<User>,
    t: Translate,
): CommentOrHistoryEntry | null {
    const from = text(before.soldierStatus);
    const to = text(after.soldierStatus);
    if (from === to) return null;
    return entry(
        'statusChange',
        t('card.history.statusChanged', { from: from || NO_STATUS, to: to || NO_STATUS }),
        { status: to || NO_STATUS, previousStatus: from || NO_STATUS },
    );
}

const where = (user: Partial<User>) => `${text(user.position)} (${text(user.unitMain)})`;
const isSpecial = (number: string) => number === 'excluded' || number.includes('order');

/** Appointed, moved or released — worded as the БЧС writes it. */
export function positionChangeEntry(
    before: Partial<User>,
    after: Partial<User>,
): CommentOrHistoryEntry | null {
    const from = text(before.shpkNumber);
    const to = text(after.shpkNumber);
    if (from === to || isSpecial(from) || isSpecial(to)) return null;
    if (!to) {
        return entry(
            'history',
            `Користувача ${text(after.fullName)} звільнено з посади ${where(before)}`,
        );
    }
    return entry(
        'history',
        from
            ? `Переміщено з посади ${where(before)} → ${where(after)}`
            : `Призначено на посаду ${where(after)}`,
    );
}

/** Values of these are not repeated in the history text (it is shown and printed). */
const PRIVATE = /iban|bankCard|passport|taxId|Series$|Number$|identificationNumber|criminal/i;

function awardChanges(before: AwardRecord[], after: AwardRecord[], t: Translate): string[] {
    const changes: string[] = [];
    const old = new Map(before.map((record) => [record.id, record]));
    const status = (record: AwardRecord) => t(`awards.statuses.${record.status}`);
    for (const record of after) {
        const previous = old.get(record.id);
        if (!previous) {
            changes.push(
                t('card.history.awardAdded', { title: awardTitle(record), status: status(record) }),
            );
        } else if (
            previous.status !== record.status ||
            awardTitle(previous) !== awardTitle(record) ||
            text(previous.orderNumber) !== text(record.orderNumber) ||
            text(previous.orderDate) !== text(record.orderDate)
        ) {
            changes.push(
                t('card.history.awardChanged', {
                    title: awardTitle(record),
                    status: status(record),
                }),
            );
        }
    }
    const kept = new Set(after.map((record) => record.id));
    for (const record of before) {
        if (!kept.has(record.id)) {
            changes.push(t('card.history.awardRemoved', { title: awardTitle(record) }));
        }
    }
    return changes;
}

const list = <T>(value: T[] | undefined | null): T[] => (Array.isArray(value) ? value : []);

/** Short descriptions of what changed on the card (status and position aside). */
export function describeCardChanges(
    before: Partial<User>,
    after: Partial<User>,
    t: Translate,
): string[] {
    const changes: string[] = [];
    // «Номер», «Серія», «Дата видачі» belong to several documents: those name their section.
    const labels = new Map(CARD_FIELDS.map((f) => [f.key, t(`card.fields.${f.key}`)]));
    const uses = new Map<string, number>();
    for (const label of labels.values()) uses.set(label, (uses.get(label) ?? 0) + 1);
    for (const section of CARD.flatMap((category) => category.sections)) {
        for (const field of section.fields) {
            if (field.key === 'soldierStatus') continue;
            const from = text(before[field.key]);
            const to = text(after[field.key]);
            if (from === to) continue;
            const own = labels.get(field.key) ?? field.key;
            const label =
                (uses.get(own) ?? 0) > 1 ? `${t(`card.sections.${section.id}`)} — ${own}` : own;
            const long = field.kind === 'textarea' || from.length > 60 || to.length > 60;
            if (long || PRIVATE.test(field.key)) {
                changes.push(label);
            } else {
                const empty = t('card.history.emptyValue');
                changes.push(`${label}: «${from || empty}» → «${to || empty}»`);
            }
        }
    }
    changes.push(...awardChanges(list(before.awardRecords), list(after.awardRecords), t));
    if (JSON.stringify(list(before.educationList)) !== JSON.stringify(list(after.educationList))) {
        changes.push(t('card.history.educationChanged'));
    }
    if (JSON.stringify(list(before.relatives)) !== JSON.stringify(list(after.relatives))) {
        changes.push(t('card.history.relativesChanged'));
    }
    if (text(before.photo) !== text(after.photo)) changes.push(t('card.history.photoChanged'));
    return changes;
}

/** All entries saving the card adds, in the order they happened. */
export function cardHistoryEntries(
    before: Partial<User>,
    after: Partial<User>,
    t: Translate,
): CommentOrHistoryEntry[] {
    const entries: CommentOrHistoryEntry[] = [];
    const status = statusChangeEntry(before, after, t);
    if (status) entries.push(status);
    const position = positionChangeEntry(before, after);
    if (position) entries.push(position);
    const changes = describeCardChanges(before, after, t);
    if (changes.length) {
        entries.push(
            entry('history', t('card.history.cardChanged', { changes: changes.join('; ') })),
        );
    }
    return entries;
}
