import { LockKeyhole, Save } from 'lucide-react';
import { useState } from 'react';

import { IDLE_LOCK_OPTIONS, type SecuritySettings } from '../../../../shared/types/settings';
import { reportError } from '../../../shared/api/errors';
import { settingsApi } from '../../../shared/api/files';
import { useAsyncData } from '../../../shared/hooks/useAsyncData';
import { Alert, Button, Card, SelectField } from '../../../shared/ui';
import { AsyncContent } from '../../../shared/ui/AsyncBoundary';
import { toast } from '../../../shared/ui/toast';
import { useI18nStore } from '../../../stores/i18nStore';

/** Security policy of this data set: when the screen locks by itself. */
export default function SecurityPanel() {
    const { t } = useI18nStore();
    const state = useAsyncData(() => settingsApi.getSecurity(), []);

    return (
        <Card
            title={t('admin.policy.title')}
            description={t('admin.policy.description')}
            icon={<LockKeyhole />}
        >
            <AsyncContent state={state}>
                {(settings) => (
                    <SecurityForm settings={settings} onSaved={(next) => state.setData(next)} />
                )}
            </AsyncContent>
        </Card>
    );
}

function SecurityForm({
    settings,
    onSaved,
}: {
    settings: SecuritySettings;
    onSaved: (settings: SecuritySettings) => void;
}) {
    const { t } = useI18nStore();
    const [minutes, setMinutes] = useState(settings.idleLockMinutes);

    const save = async () => {
        try {
            onSaved(await settingsApi.updateSecurity({ idleLockMinutes: minutes }));
            toast.success(t('admin.policy.saved'));
        } catch (err) {
            reportError(err, { context: 'security-settings' });
        }
    };

    return (
        <div className="space-y-4">
            <SelectField
                label={t('admin.policy.idleLock')}
                value={minutes}
                onChange={(value) => setMinutes(Number(value))}
                options={IDLE_LOCK_OPTIONS.map((option) => ({
                    value: option,
                    label: t('admin.policy.minutes', { count: option }),
                }))}
                className="max-w-xs"
            />
            <Alert tone="info">{t('admin.policy.explain')}</Alert>
            <Button
                icon={<Save className="size-4" />}
                disabled={minutes === settings.idleLockMinutes}
                onClick={save}
            >
                {t('common.save')}
            </Button>
        </div>
    );
}
