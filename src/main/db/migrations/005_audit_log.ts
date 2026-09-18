import { SQL_NOW_ISO } from './helpers';
import type { Migration } from './types';

/**
 * Append-only journal of security-relevant actions: who did what and when.
 * `details` holds ids and counts only — never personal data.
 * Triggers make the table immutable from SQL (no UPDATE / DELETE).
 */
export const auditLog: Migration = {
    version: 5,
    name: 'audit-log',
    async up(db) {
        await db.exec(`
            CREATE TABLE audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                occurred_at TEXT NOT NULL DEFAULT (${SQL_NOW_ISO}),
                instance_id TEXT,
                account_id INTEGER,
                account_username TEXT,
                action TEXT NOT NULL,
                outcome TEXT NOT NULL CHECK (outcome IN ('success', 'denied', 'failure')),
                details TEXT
            );
            CREATE INDEX idx_audit_log_occurred ON audit_log(occurred_at);
            CREATE INDEX idx_audit_log_account ON audit_log(account_id, occurred_at);
            CREATE INDEX idx_audit_log_action ON audit_log(action, occurred_at);

            CREATE TRIGGER trg_audit_log_no_update
            BEFORE UPDATE ON audit_log
            BEGIN
                SELECT RAISE(ABORT, 'audit_log is append-only');
            END;

            CREATE TRIGGER trg_audit_log_no_delete
            BEFORE DELETE ON audit_log
            BEGIN
                SELECT RAISE(ABORT, 'audit_log is append-only');
            END;
        `);
    },
};
