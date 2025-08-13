import { Download, Maximize2, Minus, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useI18nStore } from '../../stores/i18nStore';

export default function CustomTitleBar() {
    const [version, setVersion] = useState('');
    const [checking, setChecking] = useState(false);
    const [hasUser, setHasUser] = useState<boolean | null>(null);
    const { t } = useI18nStore();
    const [isDefaultAdmin, setIsDefaultAdmin] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const isOnAdminPanel = location.pathname === '/default-admin';

    useEffect(() => {
        setIsDefaultAdmin(
            sessionStorage.getItem('role') === 'admin' ||
                sessionStorage.getItem('role') === 'default_admin',
        );
    }, []);

    useEffect(() => {
        window.electronAPI.getAppVersion().then(setVersion);
        window.electronAPI.hasUser().then(setHasUser);
    }, []);

    const handleCheckUpdate = async () => {
        setChecking(true);
        const result = await window.electronAPI.checkForUpdates();
        setChecking(false);
        if (result.status === 'error') {
            alert(t('titleBar.updateError') + ': ' + result.message);
        } else {
            alert(t('titleBar.updateStarted'));
        }
    };

    const handleRestore = async () => {
        // if (!hasUser) {
        //     alert(t('titleBar.restoreNoUser'));
        //     return;
        // }

        const success = await window.electronAPI.restoreDb();
        if (success) {
            alert(t('titleBar.restoreSuccess'));
            window.location.reload();
        } else {
            alert(t('titleBar.restoreFail'));
        }
    };

    const handleResetDb = async () => {
        const confirmReset = window.confirm(t('titleBar.resetConfirm'));
        if (!confirmReset) return;

        const success = await window.electronAPI.resetDb();
        if (success) {
            localStorage.removeItem('authToken');
            sessionStorage.removeItem('authToken');

            alert(t('titleBar.resetSuccess'));
            window.location.reload();
        } else {
            alert(t('titleBar.resetFail'));
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
                {/* Uncomment if you want update button */}
                {isOnAdminPanel ? (
                    <button
                        className="p-1 hover:bg-indigo-600 rounded"
                        title={t('titleBar.returnToApp')}
                        onClick={() => navigate('/')}
                    >
                        ⬅️
                    </button>
                ) : (
                    isDefaultAdmin && (
                        <button
                            className="p-1 hover:bg-indigo-600 rounded"
                            title={t('titleBar.adminPanel')}
                            onClick={() => navigate('/default-admin')}
                        >
                            🛠️
                        </button>
                    )
                )}

                <button
                    className="p-1 hover:bg-blue-600 rounded"
                    title={t('titleBar.updateCheck')}
                    onClick={handleCheckUpdate}
                >
                    <Download className="w-4 h-4" />
                </button>

                {/* {hasUser && ( */}
                <button
                    className={`p-1 rounded 'hover:bg-green-600' `}
                    title={t('titleBar.restore')}
                    onClick={handleRestore}
                >
                    <Upload className="w-4 h-4" />
                </button>
                {/* )} */}

                <button
                    className="p-1 hover:bg-yellow-600 rounded"
                    title={t('titleBar.reset')}
                    onClick={handleResetDb}
                >
                    <Trash2 className="w-4 h-4" />
                </button>

                <button
                    className="p-1 hover:bg-gray-600 rounded"
                    title={t('titleBar.reload')}
                    onClick={() => window.location.reload()}
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
                {/* ✅ HIDE BUTTON */}
                <button
                    className="p-1 hover:bg-gray-500 rounded"
                    title={t('titleBar.hide')}
                    onClick={() => window.electronAPI.hideApp()}
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
