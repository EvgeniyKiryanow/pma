import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { Alert, Button } from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';

/** Shows a one-time recovery code with a copy button. */
export default function RecoveryCodeDisplay({ code }: { code: string }) {
    const { t } = useI18nStore();
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className="space-y-4">
            <Alert tone="warning">{t('auth.recoveryCode.description')}</Alert>
            <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3">
                <code className="select-all font-mono text-xl font-semibold tracking-widest text-gray-900">
                    {code}
                </code>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={copy}
                    icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                >
                    {copied ? t('auth.recoveryCode.copied') : t('auth.recoveryCode.copy')}
                </Button>
            </div>
        </div>
    );
}
