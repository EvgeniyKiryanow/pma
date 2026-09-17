import { Download, Maximize2, Minus, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useI18nStore } from '../../stores/i18nStore';
import { useSessionStore } from '../../stores/sessionStore';

/**
 * Frameless window title bar. Only window controls live here: data operations
 * (restore, reset) moved to the Backups tab where they require permissions.
 */
export default function CustomTitleBar() {
    const { t } = useI18nStore();
    const [version, setVersion] = useState('');
    const [checking, setChecking] = useState(false);
    const isSignedIn = useSessionStore((s) => s.status === 'ready');

    useEffect(() => {
        void window.electronAPI.getAppVersion().then(setVersion);
    }, []);

    const handleCheckUpdate = async () => {
        setChecking(true);
        try {
            const result = await window.electronAPI.checkForUpdates();
            if (result.status === 'error') alert(`${t('titleBar.updateError')}: ${result.message}`);
            else alert(t('titleBar.updateStarted'));
        } finally {
            setChecking(false);
        }
    };

    return (
        <div
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-gray-800 text-white select-none shadow-md"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
            <div className="flex items-center gap-4 text-sm font-semibold">
                <span>{t('titleBar.title')}</span>
                {version && <span className="text-gray-400">v{version}</span>}
            </div>

            <div
                className="flex gap-2"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                {isSignedIn && (
                    <button
                        className="p-1 hover:bg-blue-600 rounded disabled:opacity-50"
                        title={t('titleBar.updateCheck')}
                        onClick={handleCheckUpdate}
                        disabled={checking}
                    >
                        <Download className="w-4 h-4" />
                    </button>
                )}
                <button
                    className="p-1 hover:bg-gray-600 rounded"
                    title={t('titleBar.reload')}
                    onClick={() => window.location.reload()}
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
                <button
                    className="p-1 hover:bg-gray-500 rounded"
                    title={t('titleBar.hide')}
                    onClick={() => void window.electronAPI.hideApp()}
                >
                    <Minus className="w-4 h-4" />
                </button>
                <button
                    className="p-1 hover:bg-gray-500 rounded"
                    title={t('titleBar.fullscreen')}
                    onClick={() => window.electronAPI.toggleFullScreen()}
                >
                    <Maximize2 className="w-4 h-4" />
                </button>
                <button
                    className="p-1 hover:bg-red-500 rounded"
                    title={t('titleBar.close')}
                    onClick={() => window.electronAPI.closeApp()}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
