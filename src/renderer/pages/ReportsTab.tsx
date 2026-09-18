import { FilePlus, FolderOpen } from 'lucide-react';
import { useEffect, useState } from 'react';

import UploadReportsTab from '../features/tabs/ui/UploadReportsTab';
import YourSavedReportsTab from '../features/tabs/ui/YourSavedReportsTab';
import { Tabs } from '../shared/ui';
import PageHeader from '../shared/ui/PageHeader';
import { useI18nStore } from '../stores/i18nStore';
import { useSearchJump } from '../stores/searchJumpStore';

type ReportsView = 'upload' | 'yourSaved';

/**
 * «Шаблони» — the report templates (shipped and uploaded); «Збережені звіти» — the files the
 * unit keeps. Both are stored in the data folder and travel with backups; a .docx can be
 * downloaded as it is or saved as PDF.
 */
export default function ReportsTab() {
    const { t } = useI18nStore();
    const [tab, setTab] = useState<ReportsView>('upload');
    const reportsJump = useSearchJump((s) => s.jumps.reports);
    useEffect(() => {
        if (reportsJump) setTab(reportsJump.view);
    }, [reportsJump]);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <PageHeader
                tabs={
                    <Tabs
                        value={tab}
                        onChange={setTab}
                        items={[
                            {
                                value: 'upload',
                                label: t('reports.uploadTab'),
                                icon: <FilePlus />,
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
                {tab === 'yourSaved' && <YourSavedReportsTab />}
            </div>
        </div>
    );
}
