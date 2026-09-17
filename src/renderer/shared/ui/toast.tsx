import { CheckCircle2, X, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { create } from 'zustand';

import { useI18nStore } from '../../stores/i18nStore';
import { toApiError } from '../api/call';

type Toast = { id: number; tone: 'success' | 'error'; message: string };

type ToastStore = {
    toasts: Toast[];
    show: (tone: Toast['tone'], message: string) => void;
    dismiss: (id: number) => void;
};

let nextId = 1;

export const useToastStore = create<ToastStore>((set, get) => ({
    toasts: [],
    show: (tone, message) => {
        const id = nextId++;
        set({ toasts: [...get().toasts.slice(-3), { id, tone, message }] });
        setTimeout(() => get().dismiss(id), tone === 'error' ? 6000 : 3500);
    },
    dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
    success: (message: string) => useToastStore.getState().show('success', message),
    error: (message: string) => useToastStore.getState().show('error', message),
};

export function ToastViewport() {
    const toasts = useToastStore((s) => s.toasts);
    const dismiss = useToastStore((s) => s.dismiss);
    return (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-80 flex-col gap-2">
            {toasts.map((item) => (
                <div
                    key={item.id}
                    role="status"
                    className={`pointer-events-auto flex items-start gap-2 rounded-lg border p-3 text-sm shadow-lg ${
                        item.tone === 'error'
                            ? 'border-red-200 bg-red-50 text-red-900'
                            : 'border-green-200 bg-green-50 text-green-900'
                    }`}
                >
                    {item.tone === 'error' ? (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <span className="flex-1">{item.message}</span>
                    <button
                        onClick={() => dismiss(item.id)}
                        className="text-current opacity-60 hover:opacity-100"
                        aria-label="Закрити"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}

const ACCESS_CODES = new Set(['FORBIDDEN', 'UNAUTHENTICATED', 'PASSWORD_CHANGE_REQUIRED']);

/**
 * Safety net for older screens that do not handle rejected IPC calls: access errors become a
 * readable notification instead of a silent failure in the console.
 */
export function useGlobalAccessErrors(): void {
    const t = useI18nStore((s) => s.t);
    useEffect(() => {
        const onRejection = (event: PromiseRejectionEvent) => {
            const error = toApiError(event.reason);
            if (!ACCESS_CODES.has(error.code)) return;
            event.preventDefault();
            toast.error(t(`errors.${error.code}`));
        };
        window.addEventListener('unhandledrejection', onRejection);
        return () => window.removeEventListener('unhandledrejection', onRejection);
    }, [t]);
}
