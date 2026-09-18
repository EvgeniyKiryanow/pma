import { AlertTriangle, HelpCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { create } from 'zustand';

import { useI18nStore } from '../../stores/i18nStore';
import { Button, cn, Modal } from './index';

export type ConfirmOptions = {
    title: string;
    message?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    /** `danger` for irreversible actions (delete, exclude, erase). */
    tone?: 'danger' | 'primary';
};

type PendingConfirm = ConfirmOptions & { resolve: (ok: boolean) => void };

const useConfirmStore = create<{ pending: PendingConfirm | null }>(() => ({ pending: null }));

/**
 * In-app replacement for `window.confirm`: resolves to true when the user confirms.
 * Requires <ConfirmHost /> to be mounted once (MainRouter does it).
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
        useConfirmStore.getState().pending?.resolve(false);
        useConfirmStore.setState({ pending: { ...options, resolve } });
    });
}

export function ConfirmHost() {
    const pending = useConfirmStore((s) => s.pending);
    const t = useI18nStore((s) => s.t);
    if (!pending) return null;

    const finish = (ok: boolean) => {
        useConfirmStore.setState({ pending: null });
        pending.resolve(ok);
    };
    const danger = pending.tone === 'danger';

    return (
        <Modal
            open
            onClose={() => finish(false)}
            title={pending.title}
            width="max-w-md"
            footer={
                <>
                    <Button variant="secondary" onClick={() => finish(false)}>
                        {pending.cancelLabel ?? t('common.cancel')}
                    </Button>
                    <Button
                        variant={danger ? 'danger' : 'primary'}
                        onClick={() => finish(true)}
                        autoFocus
                    >
                        {pending.confirmLabel ?? t('common.confirm')}
                    </Button>
                </>
            }
        >
            <div className="flex gap-3.5">
                <span
                    className={cn(
                        'grid size-10 shrink-0 place-items-center rounded-full',
                        danger ? 'bg-danger-soft text-danger' : 'bg-primary-soft text-primary-ink',
                    )}
                >
                    {danger ? (
                        <AlertTriangle className="size-5" />
                    ) : (
                        <HelpCircle className="size-5" />
                    )}
                </span>
                <div className="min-w-0 pt-1 text-sm leading-relaxed text-ink-2">
                    {pending.message ?? null}
                </div>
            </div>
        </Modal>
    );
}
