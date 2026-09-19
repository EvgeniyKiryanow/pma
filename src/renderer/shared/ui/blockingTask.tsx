import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';

import { Loader } from './loader';

type Task = { id: number; message: string };

const useBlockingStore = create<{ tasks: Task[] }>(() => ({ tasks: [] }));

let nextId = 1;

/**
 * Runs work that must not be interrupted (generating a report, exporting a workbook) behind
 * a window-wide overlay with the loader and a message. Tasks may overlap; the overlay stays
 * until the last one finishes and always goes away, even when the work throws.
 * Requires <BlockingTaskHost /> to be mounted once.
 */
export async function runBlocking<T>(message: string, work: () => Promise<T>): Promise<T> {
    const id = nextId++;
    useBlockingStore.setState((state) => ({ tasks: [...state.tasks, { id, message }] }));
    try {
        return await work();
    } finally {
        useBlockingStore.setState((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id),
        }));
    }
}

/**
 * Overlay for `runBlocking`. Appears after a short delay so instant tasks do not flash.
 * It stops below the title bar: the window can always be minimized or closed.
 */
export function BlockingTaskHost({ delay = 150 }: { delay?: number }) {
    const tasks = useBlockingStore((state) => state.tasks);
    const active = tasks.length > 0;
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!active) {
            setVisible(false);
            return;
        }
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [active, delay]);

    if (!active || !visible) return null;
    const message = tasks[tasks.length - 1].message;

    return createPortal(
        <div
            className="fixed inset-x-0 bottom-0 top-10 z-[70] grid animate-fade-in place-items-center bg-canvas/70 backdrop-blur-sm"
            aria-busy="true"
            aria-live="polite"
        >
            <div className="flex animate-pop-in flex-col items-center gap-4 rounded-2xl border border-line bg-surface px-10 py-8 shadow-pop">
                <Loader size="xl" label={null} />
                <p role="status" className="max-w-xs text-center text-sm font-medium text-ink-2">
                    {message}
                </p>
            </div>
        </div>,
        document.body,
    );
}
