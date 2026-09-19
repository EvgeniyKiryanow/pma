import type { Migration } from './types';

/**
 * "YYYY-MM-DD" of a period bound written as "2026-09-01…" or "01.09.2026"; NULL for anything
 * else (the caller then decides in code — a NULL day never filters a period out).
 */
function dayOf(value: string): string {
    return `CASE
        WHEN ${value} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]*' THEN substr(${value}, 1, 10)
        WHEN ${value} GLOB '[0-9][0-9].[0-9][0-9].[0-9][0-9][0-9][0-9]'
            THEN substr(${value}, 7, 4) || '-' || substr(${value}, 4, 2) || '-' || substr(${value}, 1, 2)
    END`;
}

/**
 * The rows of `history_index` for the history JSON of one person (`source` = NEW).
 * Only what the summaries need: the entry itself stays in `users.history`.
 */
function historyIndexRows(source: string, from = ''): string {
    return `
        INSERT INTO history_index
            (user_id, entry_id, pos, type, date, status, previous_status, description, content,
             has_period, period_from, period_to, from_day, to_day, file_count)
        SELECT
            ${source}.id,
            json_extract(e.value, '$.id'),
            CAST(e.key AS INTEGER),
            json_extract(e.value, '$.type'),
            json_extract(e.value, '$.date'),
            json_extract(e.value, '$.status'),
            json_extract(e.value, '$.previousStatus'),
            CASE WHEN json_extract(e.value, '$.type') = 'statusChange'
                 THEN json_extract(e.value, '$.description') END,
            CASE WHEN json_extract(e.value, '$.type') = 'statusChange'
                 THEN json_extract(e.value, '$.content') END,
            CASE json_type(e.value, '$.period')
                WHEN 'object' THEN 1
                WHEN 'array' THEN 1
                WHEN 'true' THEN 1
                WHEN 'text' THEN json_extract(e.value, '$.period') <> ''
                WHEN 'integer' THEN json_extract(e.value, '$.period') <> 0
                WHEN 'real' THEN json_extract(e.value, '$.period') <> 0
                ELSE 0 END,
            json_extract(e.value, '$.period.from'),
            json_extract(e.value, '$.period.to'),
            ${dayOf("json_extract(e.value, '$.period.from')")},
            ${dayOf("json_extract(e.value, '$.period.to')")},
            CASE json_type(e.value, '$.files')
                WHEN 'array' THEN json_array_length(e.value, '$.files')
                ELSE 0 END
        FROM ${from} json_each(
            CASE WHEN json_valid(${source}.history) AND json_type(${source}.history) = 'array'
                 THEN ${source}.history ELSE '[]' END
        ) AS e
        WHERE e.type = 'object';`;
}

/**
 * History is a JSON array in the person's row (that is how it travels between computers, and
 * older versions read it so). Summaries over everyone — the red badge, the dashboard, the
 * named list — parsed every array on every call: seconds with a thousand people with long
 * histories, and the window froze meanwhile. `history_index` holds one small row per entry,
 * kept current by triggers, so any writer (the app, an imported change log, a restored
 * backup) updates it, and the summaries are indexed queries.
 */
export const historyIndex: Migration = {
    version: 15,
    name: 'history-index',
    async up(db) {
        // entry_id has no declared type: `5` and `'5'` stay different, as in the JSON.
        await db.exec(`
            CREATE TABLE history_index (
                user_id INTEGER NOT NULL,
                entry_id,
                pos INTEGER NOT NULL,
                type TEXT,
                date TEXT,
                status TEXT,
                previous_status TEXT,
                description TEXT,
                content TEXT,
                has_period INTEGER NOT NULL DEFAULT 0,
                period_from TEXT,
                period_to TEXT,
                from_day TEXT,
                to_day TEXT,
                file_count INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX ix_history_index_user ON history_index(user_id, pos);
            CREATE INDEX ix_history_index_entry ON history_index(entry_id);
            CREATE INDEX ix_history_index_type_date ON history_index(type, date);
            CREATE INDEX ix_history_index_period ON history_index(type, to_day, from_day);
            CREATE INDEX ix_history_index_files ON history_index(date) WHERE file_count > 0;
            CREATE INDEX ix_history_index_incomplete ON history_index(user_id, pos)
                WHERE type = 'statusChange' AND (file_count = 0 OR has_period = 0);

            CREATE TRIGGER trg_users_history_index_insert
            AFTER INSERT ON users
            FOR EACH ROW
            BEGIN
                ${historyIndexRows('NEW')}
            END;

            CREATE TRIGGER trg_users_history_index_update
            AFTER UPDATE OF history ON users
            FOR EACH ROW
            BEGIN
                DELETE FROM history_index WHERE user_id = OLD.id;
                ${historyIndexRows('NEW')}
            END;

            CREATE TRIGGER trg_users_history_index_delete
            AFTER DELETE ON users
            FOR EACH ROW
            BEGIN
                DELETE FROM history_index WHERE user_id = OLD.id;
            END;
        `);
        await db.exec(historyIndexRows('users', 'users,'));
    },
};
