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

export default function ReportsTab() {
    const { t } = useI18nStore();
    const { can } = usePermissions();
    const [tab, setTab] = useState<ReportsView>('saved');

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
                                label: 'Створити рапорт',
                                icon: <FileText />,
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
                {tab === 'saved' && <SavedReportsTab />}
                {tab === 'yourSaved' && <YourSavedReportsTab />}
            </div>
        </div>
    );
}
