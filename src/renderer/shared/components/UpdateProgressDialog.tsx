import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { UpdateProgress } from '../../../shared/types/system';
import { useI18nStore } from '../../stores/i18nStore';
import { systemApi } from '../api/system';
import { Button, Modal } from '../ui';

const MB = 1024 * 1024;
const megabytes = (bytes: number) => (bytes / MB).toFixed(bytes >= 10 * MB ? 0 : 1);

/**
 * Download of an update: how far it is and a way out. The window stays usable around it
 * (the title bar, closing the program); «Скасувати» stops the download at once.
 */
export function UpdateProgressDialog({
    version,
    phase,
    onCancel,
}: {
    version: string;
    phase: 'downloading' | 'restarting';
    onCancel: () => void;
}) {
    const { t } = useI18nStore();
    const [progress, setProgress] = useState<UpdateProgress | null>(null);
    const [canceling, setCanceling] = useState(false);

    useEffect(() => systemApi.onUpdateProgress(setProgress), []);
    const cancel = () => {
        setCanceling(true);
        onCancel();
    };

    const percent = phase === 'restarting' ? 100 : (progress?.percent ?? 0);
    const known = Boolean(progress && progress.total > 0);
    const detail =
        phase === 'restarting'
            ? t('titleBar.updateRestarting')
            : known
              ? t('titleBar.updateProgress', {
                    done: megabytes(progress!.transferred),
                    total: megabytes(progress!.total),
                    speed: megabytes(progress!.bytesPerSecond),
                })
              : t('titleBar.updateConnecting');

    return (
        <Modal
            open
            icon={<Download />}
            title={t('titleBar.updateDownloadingTitle', { version })}
            description={t('titleBar.updateDownloadingHint')}
            onClose={phase === 'downloading' && !canceling ? cancel : () => undefined}
            closeOnBackdrop={false}
            width="max-w-md"
            footer={
                phase === 'downloading' ? (
                    <Button variant="secondary" disabled={canceling} onClick={cancel}>
                        {t('titleBar.updateCancel')}
                    </Button>
                ) : undefined
            }
        >
            <div className="space-y-2">
                <div
                    className="h-2.5 overflow-hidden rounded-full bg-line"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                >
                    <div
                        className={
                            known || phase === 'restarting'
                                ? 'h-full rounded-full bg-primary transition-[width] duration-300'
                                : 'h-full w-1/3 animate-pulse rounded-full bg-primary/60'
                        }
                        style={
                            known || phase === 'restarting' ? { width: `${percent}%` } : undefined
                        }
                    />
                </div>
                <div className="flex items-baseline justify-between gap-3 text-[13px] text-ink-3">
                    <span>{detail}</span>
                    {known && phase === 'downloading' && (
                        <span className="font-mono tabular-nums text-ink-2">{percent}%</span>
                    )}
                </div>
            </div>
        </Modal>
    );
}
