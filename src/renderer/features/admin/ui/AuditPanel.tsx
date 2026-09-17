import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { AuditEntryDTO, AuditOutcome } from '../../../../shared/audit/types';
import { errorMessage, unwrap } from '../../../shared/api/call';
import {
    Alert,
    Badge,
    Button,
    Card,
    formatDateTime,
    SelectField,
    TextField,
} from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';

const PAGE_SIZE = 50;

export default function AuditPanel() {
    const { t } = useI18nStore();
    const [items, setItems] = useState<AuditEntryDTO[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [action, setAction] = useState('');
    const [outcome, setOutcome] = useState<AuditOutcome | ''>('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const page = await unwrap(
                window.electronAPI.audit.list({
                    limit: PAGE_SIZE,
                    offset,
                    action: action.trim() || undefined,
                    outcome: outcome || undefined,
                }),
            );
            setItems(page.items);
            setTotal(page.total);
        } catch (err) {
            setError(errorMessage(err, t));
        } finally {
            setLoading(false);
        }
    }, [offset, action, outcome, t]);

    useEffect(() => {
        const timer = setTimeout(() => void load(), 250);
        return () => clearTimeout(timer);
    }, [load]);

    const actionLabel = (key: string) => {
        const label = t(`auditActions.${key}`);
        return label === `auditActions.${key}` ? key : label;
    };

    const outcomeBadge = (value: AuditOutcome) => (
        <Badge tone={value === 'success' ? 'green' : value === 'denied' ? 'amber' : 'red'}>
            {t(`admin.audit.${value}`)}
        </Badge>
    );

    return (
        <Card
            title={t('admin.audit.title')}
            description={t('admin.audit.description')}
            actions={
                <Button
                    variant="secondary"
                    icon={<RefreshCw className="h-4 w-4" />}
                    loading={loading}
                    onClick={() => void load()}
                >
                    {t('admin.audit.refresh')}
                </Button>
            }
        >
            <div className="mb-4 flex flex-wrap items-end gap-3">
                <TextField
                    className="min-w-[220px] flex-1"
                    label={t('admin.audit.filterAction')}
                    value={action}
                    onChange={(e) => {
                        setOffset(0);
                        setAction(e.target.value);
                    }}
                />
                <SelectField
                    className="w-48"
                    label={t('admin.audit.filterOutcome')}
                    value={outcome}
                    onChange={(value) => {
                        setOffset(0);
                        setOutcome(value as AuditOutcome | '');
                    }}
                    options={[
                        { value: '', label: t('admin.audit.all') },
                        { value: 'success', label: t('admin.audit.success') },
                        { value: 'denied', label: t('admin.audit.denied') },
                        { value: 'failure', label: t('admin.audit.failure') },
                    ]}
                />
            </div>

            {error && (
                <Alert tone="error" className="mb-3">
                    {error}
                </Alert>
            )}

            {items.length === 0 && !loading ? (
                <p className="text-sm text-gray-500">{t('admin.audit.empty')}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                                <th className="py-2 pr-3">{t('admin.audit.time')}</th>
                                <th className="py-2 pr-3">{t('admin.audit.account')}</th>
                                <th className="py-2 pr-3">{t('admin.audit.action')}</th>
                                <th className="py-2 pr-3">{t('admin.audit.outcome')}</th>
                                <th className="py-2">{t('admin.audit.details')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id} className="border-b last:border-0">
                                    <td className="whitespace-nowrap py-2 pr-3 text-gray-600">
                                        {formatDateTime(item.occurredAt)}
                                    </td>
                                    <td className="py-2 pr-3">
                                        {item.accountUsername ?? (
                                            <span className="text-gray-400">
                                                {t('admin.audit.system')}
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-2 pr-3" title={item.action}>
                                        {actionLabel(item.action)}
                                    </td>
                                    <td className="py-2 pr-3">{outcomeBadge(item.outcome)}</td>
                                    <td className="py-2 font-mono text-xs text-gray-500">
                                        {item.details ? JSON.stringify(item.details) : ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <span>{t('admin.audit.total', { count: total })}</span>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={offset === 0}
                        onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    >
                        {t('admin.audit.prev')}
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={offset + PAGE_SIZE >= total}
                        onClick={() => setOffset(offset + PAGE_SIZE)}
                    >
                        {t('admin.audit.next')}
                    </Button>
                </div>
            </div>
        </Card>
    );
}
