export function Toast({ kind = 'ok', text }: { kind?: 'ok' | 'err'; text: string }) {
    const cls =
        kind === 'ok'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800';
    return <div className={`p-3 border rounded-lg shadow-sm ${cls}`}>{text}</div>;
}
