import { FileDown, Info } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { AboutInfo } from '../../../shared/types/system';
import { useI18nStore } from '../../stores/i18nStore';
import { ApiError, errorMessage } from '../api/call';
import { systemApi } from '../api/system';
import { Alert, Button, formatDateTime, Modal } from '../ui';

/** «Про програму»: version, build, system, where the data is, who to contact; the support log. */
export default function AboutDialog({ onClose }: { onClose: () => void }) {
    const { t } = useI18nStore();
    const [info, setInfo] = useState<AboutInfo | null>(null);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        systemApi
            .about()
            .then(setInfo)
            .catch((err) => setNotice({ tone: 'error', text: errorMessage(err, t) }));
    }, [t]);

    const saveLog = async () => {
        setSaving(true);
        setNotice(null);
        try {
            const saved = await systemApi.saveLog();
            setNotice({ tone: 'success', text: t('about.logSaved', { file: saved.fileName }) });
        } catch (err) {
            if (!(err instanceof ApiError && err.code === 'CANCELED')) {
                setNotice({ tone: 'error', text: errorMessage(err, t) });
            }
        } finally {
            setSaving(false);
        }
    };

    const rows: [string, string][] = info
        ? [
              [t('about.version'), info.version],
              [t('about.built'), info.builtAt ? formatDateTime(info.builtAt) : '—'],
              [t('about.system'), `${info.system} · ${info.engine}`],
              [t('about.data'), info.dataFolder],
              [
                  t('about.developer'),
                  [info.developer.name, info.developer.email].filter(Boolean).join(' · ') || '—',
              ],
          ]
        : [];

    return (
        <Modal
            open
            onClose={onClose}
            title={t('about.title')}
            icon={<Info />}
            width="max-w-xl"
            footer={
                <Button variant="secondary" onClick={onClose}>
                    {t('about.close')}
                </Button>
            }
        >
            <div className="space-y-4">
                <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
                    {rows.map(([label, value]) => (
                        <div key={label} className="contents">
                            <dt className="text-ink-3">{label}</dt>
                            <dd className="break-all font-medium text-ink">{value}</dd>
                        </div>
                    ))}
                </dl>
                <div className="space-y-2 rounded-xl border border-line bg-surface-2 p-3">
                    <p className="text-[13px] text-ink-2">{t('about.logHint')}</p>
                    <Button
                        variant="secondary"
                        size="sm"
                        loading={saving}
                        icon={<FileDown className="h-4 w-4" />}
                        onClick={() => void saveLog()}
                    >
                        {t('about.saveLog')}
                    </Button>
                </div>
                {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
            </div>
        </Modal>
    );
}
