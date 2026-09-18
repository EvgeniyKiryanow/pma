import { AlertTriangle } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Last line of defence for the interface: without it a rendering error leaves a white
 * window with no explanation. The error is also printed to the console, which the main
 * process writes into the log file.
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
            <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6 pt-16">
                <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-lg">
                    <div className="mb-3 flex items-center gap-2 text-red-700">
                        <AlertTriangle className="h-5 w-5" />
                        <h1 className="text-lg font-semibold">Сталася помилка в інтерфейсі</h1>
                    </div>
                    <p className="text-sm text-gray-700">
                        Дані не втрачені: вони зберігаються в базі, а не у вікні програми.
                        Перезавантажте вікно. Якщо помилка повторюється, надішліть журнал
                        програми (тека <code className="rounded bg-gray-100 px-1">logs</code> у
                        даних застосунку).
                    </p>
                    <pre className="mt-3 max-h-32 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-600">
                        {error.message}
                    </pre>
                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            onClick={() => this.setState({ error: null })}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                        >
                            Спробувати ще раз
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            Перезавантажити вікно
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}
