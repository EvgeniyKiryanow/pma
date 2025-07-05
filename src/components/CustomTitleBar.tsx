import { X, RotateCcw } from 'lucide-react';

export default function CustomTitleBar() {
    return (
        <div
            className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white select-none"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
            <div className="text-sm font-semibold">Control Panel Manager</div>

            <div
                className="flex gap-2"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                <button
                    className="p-1 hover:bg-gray-600 rounded"
                    onClick={() => window.location.reload()}
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
                <button className="p-1 hover:bg-red-500 rounded" onClick={() => window.close()}>
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
