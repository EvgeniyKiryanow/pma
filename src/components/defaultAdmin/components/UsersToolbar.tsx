export default function UsersToolbar({
    q,
    setQ,
    sortAsc,
    setSortAsc,
}: {
    q: string;
    setQ: (s: string) => void;
    sortAsc: boolean;
    setSortAsc: (v: boolean) => void;
}) {
    return (
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="flex-1">
                <input
                    className="w-full border border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg px-3 py-2 text-sm outline-none transition"
                    placeholder="Пошук за username…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
            </div>
            <button
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                onClick={() => setSortAsc(!sortAsc)}
            >
                Сортування: {sortAsc ? '↑ A–Z' : '↓ Z–A'}
            </button>
        </div>
    );
}
