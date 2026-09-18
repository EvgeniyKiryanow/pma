import { NotebookPen, Pin } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import {
    JOURNAL_PRIORITIES,
    type JournalEntry,
    type JournalEntryInput,
} from '../../../../shared/types/journal';
import { errorMessage } from '../../../shared/api/call';
import { journalApi } from '../../../shared/api/documents';
import AttachedFiles from '../../../shared/components/AttachedFiles';
import { useAsyncAction } from '../../../shared/hooks/useAsyncAction';
import { Alert, Button, cn, Modal } from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';
import { useUserStore } from '../../../stores/userStore';
import { isoDay, journalCategories, useJournalStore } from '../model/journalStore';

const PRIORITY_STYLES = {
    high: 'border-danger/60 bg-danger-soft text-danger-ink',
    normal: 'border-primary bg-primary-soft text-primary-ink',
    low: 'border-line-strong bg-surface-2 text-ink-2',
} as const;

const empty = (): JournalEntryInput => ({
    title: '',
    body: '',
    dueDate: null,
    dueTime: null,
    priority: 'normal',
    category: '',
    done: false,
    pinned: false,
    files: [],
    userId: null,
});

/** Adds or changes a journal entry: what, when, how urgent, about whom, with which files. */
export default function JournalEntryEditor({
    entry,
    initial,
    onClose,
}: {
    /** Null: a new entry. */
    entry: JournalEntry | null;
    /** Pre-filled values of a new entry (a date chosen on the desktop, a person). */
    initial?: Partial<JournalEntryInput>;
    onClose: () => void;
}) {
    const { t } = useI18nStore();
    const id = useId();
    const field = (name: string) => `${id}-${name}`;
    const entries = useJournalStore((s) => s.entries);
    const users = useUserStore((s) => s.users);
    const [form, setForm] = useState<JournalEntryInput>(
        entry
            ? {
                  uuid: entry.uuid,
                  title: entry.title,
                  body: entry.body,
                  dueDate: entry.dueDate,
                  dueTime: entry.dueTime,
                  priority: entry.priority,
                  category: entry.category,
                  done: entry.done,
                  pinned: entry.pinned,
                  files: entry.files,
                  userId: entry.userId,
              }
            : { ...empty(), ...initial },
    );
    const set = (patch: Partial<JournalEntryInput>) => setForm((f) => ({ ...f, ...patch }));
    const categories = useMemo(() => journalCategories(entries), [entries]);
    const person = users.find((u) => u.id === form.userId);
    const [personText, setPersonText] = useState(person?.fullName ?? '');

    const save = useAsyncAction(
        (input: JournalEntryInput) => useJournalStore.getState().save(input),
        {
            success: t('journal.saved'),
            error: false,
            onSuccess: onClose,
            context: 'journal.save',
        },
    );

    const today = new Date();
    const quickDates = [
        { label: t('journal.quick.today'), value: isoDay(today) },
        {
            label: t('journal.quick.tomorrow'),
            value: isoDay(new Date(today.getTime() + 86_400_000)),
        },
        {
            label: t('journal.quick.week'),
            value: isoDay(new Date(today.getTime() + 7 * 86_400_000)),
        },
    ];

    return (
        <Modal
            open
            onClose={onClose}
            title={entry ? t('journal.editTitle') : t('journal.newTitle')}
            description={t('journal.editorHint')}
            icon={<NotebookPen />}
            width="max-w-2xl"
            closeOnBackdrop={false}
            footer={
                <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm text-ink">
                        <input
                            type="checkbox"
                            className="size-4"
                            checked={form.pinned}
                            onChange={(e) => set({ pinned: e.target.checked })}
                        />
                        <Pin className="size-4 text-ink-3" />
                        {t('journal.pin')}
                    </label>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            loading={save.pending}
                            disabled={!form.title.trim()}
                            onClick={() => void save.run(form)}
                        >
                            {t('common.save')}
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {save.error && <Alert tone="error">{errorMessage(save.error, t)}</Alert>}
                <div>
                    <label htmlFor={field('title')} className="label">
                        {t('journal.fields.title')}
                    </label>
                    <input
                        id={field('title')}
                        className="field text-[15px]"
                        autoFocus
                        value={form.title}
                        placeholder={t('journal.fields.titlePlaceholder')}
                        onChange={(e) => set({ title: e.target.value })}
                    />
                </div>
                <div>
                    <label htmlFor={field('body')} className="label">
                        {t('journal.fields.body')}
                    </label>
                    <textarea
                        id={field('body')}
                        className="field min-h-28"
                        value={form.body}
                        placeholder={t('journal.fields.bodyPlaceholder')}
                        onChange={(e) => set({ body: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                    <div>
                        <label htmlFor={field('date')} className="label">
                            {t('journal.fields.dueDate')}
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                id={field('date')}
                                type="date"
                                className="field w-44"
                                value={form.dueDate ?? ''}
                                onChange={(e) => set({ dueDate: e.target.value || null })}
                            />
                            <input
                                type="time"
                                aria-label={t('journal.fields.dueTime')}
                                className="field w-28"
                                disabled={!form.dueDate}
                                value={form.dueTime ?? ''}
                                onChange={(e) => set({ dueTime: e.target.value || null })}
                            />
                            {quickDates.map((quick) => (
                                <button
                                    key={quick.label}
                                    type="button"
                                    onClick={() => set({ dueDate: quick.value })}
                                    className={cn(
                                        'rounded-full border px-2.5 py-1 text-xs font-medium',
                                        form.dueDate === quick.value
                                            ? 'border-primary bg-primary-soft text-primary-ink'
                                            : 'border-line text-ink-3 hover:text-ink',
                                    )}
                                >
                                    {quick.label}
                                </button>
                            ))}
                            {form.dueDate && (
                                <button
                                    type="button"
                                    onClick={() => set({ dueDate: null, dueTime: null })}
                                    className="text-xs text-ink-3 underline hover:text-ink"
                                >
                                    {t('journal.quick.noDate')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                        <p className="label">{t('journal.fields.priority')}</p>
                        <div className="flex gap-1">
                            {JOURNAL_PRIORITIES.map((priority) => (
                                <button
                                    key={priority}
                                    type="button"
                                    aria-pressed={form.priority === priority}
                                    onClick={() => set({ priority })}
                                    className={cn(
                                        'flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
                                        form.priority === priority
                                            ? PRIORITY_STYLES[priority]
                                            : 'border-line text-ink-3 hover:text-ink',
                                    )}
                                >
                                    {t(`journal.priority.${priority}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor={field('category')} className="label">
                            {t('journal.fields.category')}
                        </label>
                        <input
                            id={field('category')}
                            className="field"
                            list={field('categories')}
                            value={form.category}
                            placeholder={t('journal.fields.categoryPlaceholder')}
                            onChange={(e) => set({ category: e.target.value })}
                        />
                        <datalist id={field('categories')}>
                            {categories.map((c) => (
                                <option key={c} value={c} />
                            ))}
                        </datalist>
                    </div>
                    <div>
                        <label htmlFor={field('person')} className="label">
                            {t('journal.fields.person')}
                        </label>
                        <input
                            id={field('person')}
                            className="field"
                            list={field('people')}
                            value={personText}
                            placeholder={t('journal.fields.personPlaceholder')}
                            onChange={(e) => {
                                setPersonText(e.target.value);
                                const found = users.find((u) => u.fullName === e.target.value);
                                set({ userId: found ? found.id : null });
                            }}
                        />
                        <datalist id={field('people')}>
                            {users
                                .filter((u) => u.shpkNumber !== 'excluded')
                                .map((u) => (
                                    <option key={u.id} value={u.fullName} />
                                ))}
                        </datalist>
                    </div>
                </div>

                <div>
                    <p className="label">{t('journal.fields.files')}</p>
                    <AttachedFiles
                        files={form.files}
                        onChange={(files) => set({ files })}
                        load={(file) =>
                            entry
                                ? journalApi.loadFile(entry.uuid, file.name)
                                : Promise.resolve(null)
                        }
                    />
                </div>
            </div>
        </Modal>
    );
}
