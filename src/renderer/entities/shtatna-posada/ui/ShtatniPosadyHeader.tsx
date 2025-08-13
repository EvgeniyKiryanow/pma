// components/ShtatniPosadyHeader.tsx
type Props = {
    total: number;
    onDeleteAll: () => void;
};

export default function ShtatniPosadyHeader({ total, onDeleteAll }: Props) {
    return (
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">📋 БЧС</h2>
            {total > 0 && (
                <button
                    className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
                    onClick={onDeleteAll}
                >
                    ❌ Видалити всі
                </button>
            )}
        </div>
    );
}
