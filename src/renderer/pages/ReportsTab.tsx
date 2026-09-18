import { FilePlus, FileText, FolderOpen } from 'lucide-react';
import { useState } from 'react';

import SavedReportsTab from '../features/tabs/ui/SavedReportsTab';
import UploadReportsTab from '../features/tabs/ui/UploadReportsTab';
import YourSavedReportsTab from '../features/tabs/ui/YourSavedReportsTab';
import { Tabs } from '../shared/ui';
import PageHeader from '../shared/ui/PageHeader';
import { useI18nStore } from '../stores/i18nStore';
import { usePermissions } from '../stores/sessionStore';

type ReportsView = 'upload' | 'saved' | 'yourSaved';

/**
 * «Створити рапорт» (a document filled in from a template) is not finished yet, so its tab is
 * hidden. Switch this on once the feature is ready; nothing else needs to change.
 */
const REPORT_CREATION_READY = false;

export default function ReportsTab() {
    const { t } = useI18nStore();
    const { can } = usePermissions();
    const [tab, setTab] = useState<ReportsView>(() => {
        if (REPORT_CREATION_READY) return 'saved';
        return can('reports.templates') ? 'upload' : 'yourSaved';
    });

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <PageHeader
                tabs={
                    <Tabs
                        value={tab}
                        onChange={setTab}
                        items={[
                            {
                                value: 'saved',
                                label: t('reports.generateFilledTemplate'),
                                icon: <FileText />,
                                hidden: !REPORT_CREATION_READY,
                            },
                            {
                                value: 'upload',
                                label: t('reports.uploadTab'),
                                icon: <FilePlus />,
                                hidden: !can('reports.templates'),
                            },
                            {
                                value: 'yourSaved',
                                label: t('reports.savedTab'),
                                icon: <FolderOpen />,
                            },
                        ]}
                    />
                }
            />

            <div className="flex min-h-0 flex-1 flex-col">
                {tab === 'upload' && <UploadReportsTab />}
                {REPORT_CREATION_READY && tab === 'saved' && <SavedReportsTab />}
                {tab === 'yourSaved' && <YourSavedReportsTab />}
            </div>
        </div>
    );
}
