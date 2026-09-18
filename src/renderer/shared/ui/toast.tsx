import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { create } from 'zustand';

import { cn } from './index';

type ToastTone = 'success' | 'error' | 'info' | 'warning';
type Toast = { id: number; tone: ToastTone; message: string };

type ToastStore = {
    toasts: Toast[];
    show: (tone: ToastTone, message: string) => void;
    dismiss: (id: number) => void;
};

let nextId = 1;

const DURATION: Record<ToastTone, number> = {
    success: 3500,
    info: 4500,
    warning: 6000,
    error: 6500,
};

export const useToastStore = create<ToastStore>((set, get) => ({
    toasts: [],
    show: (tone, message) => {
        const id = nextId++;
        set({ toasts: [...get().toasts.slice(-3), { id, tone, message }] });
        setTimeout(() => get().dismiss(id), DURATION[tone]);
    },
    dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
    success: (message: string) => useToastStore.getState().show('success', message),
    error: (message: string) => useToastStore.getState().show('error', message),
    info: (message: string) => useToastStore.getState().show('info', message),
    warning: (message: string) => useToastStore.getState().show('warning', message),
};

const TONES: Record<ToastTone, { icon: ReactNode; accent: string }> = {
    success: { icon: <CheckCircle2 className="size-[18px]" />, accent: 'text-success' },
    error: { icon: <XCircle className="size-[18px]" />, accent: 'text-danger' },
    info: { icon: <Info className="size-[18px]" />, accent: 'text-info' },
    warning: { icon: <AlertTriangle className="size-[18px]" />, accent: 'text-warning' },
};

export function ToastViewport() {
    const toasts = useToastStore((s) => s.toasts);
    const dismiss = useToastStore((s) => s.dismiss);
    return (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
            {toasts.map((item) => (
                <div
                    key={item.id}
                    role="status"
                    className="pointer-events-auto flex animate-slide-up items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink shadow-pop"
                >
                    <span className={cn('mt-px shrink-0', TONES[item.tone].accent)}>
                        {TONES[item.tone].icon}
                    </span>
                    <span className="min-w-0 flex-1 whitespace-pre-line leading-relaxed">
                        {item.message}
                    </span>
                    <button
                        onClick={() => dismiss(item.id)}
                        className="-mr-1 grid size-6 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
                        aria-label="Закрити"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}
