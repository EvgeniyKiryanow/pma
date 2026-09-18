import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Last line of defence for the interface: without it a rendering error leaves a white
 * window with no explanation. The error is also printed to the console, which the main
 * process writes into the log file. Kept free of shared UI components on purpose: it must
 * render even when those are the ones failing.
 */
export default class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('UI error:', error.message, info.componentStack);
    }

    render(): ReactNode {
        const { error } = this.state;
        if (!error) return this.props.children;

        return (
            <div className="flex min-h-screen items-center justify-center bg-canvas p-6 pt-16">
                <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
                    <div className="flex items-center gap-3 border-b border-line bg-danger-soft px-6 py-4">
                        <span className="grid size-9 place-items-center rounded-xl bg-danger text-on-danger">
                            <AlertTriangle className="size-[18px]" />
                        </span>
                        <h1 className="text-base font-semibold text-danger-ink">
                            Сталася помилка в інтерфейсі
                        </h1>
                    </div>
                    <div className="space-y-3 px-6 py-5">
                        <p className="text-sm leading-relaxed text-ink-2">
                            Дані не втрачені: вони зберігаються в базі, а не у вікні програми.
                            Перезавантажте вікно. Якщо помилка повторюється, надішліть журнал
                            програми (тека{' '}
                            <code className="rounded bg-surface-3 px-1 font-mono text-xs">
                                logs
                            </code>{' '}
                            у даних застосунку).
                        </p>
                        <pre className="max-h-32 overflow-auto rounded-lg border border-line bg-surface-2 p-3 font-mono text-xs text-ink-3">
                            {error.message}
                        </pre>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-line bg-surface-2 px-6 py-3">
                        <button
                            onClick={() => this.setState({ error: null })}
                            className="h-9 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-2"
                        >
                            Спробувати ще раз
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover"
                        >
                            <RotateCcw className="size-4" />
                            Перезавантажити вікно
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}
