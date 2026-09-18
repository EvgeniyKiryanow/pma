import { renderAsync } from 'docx-preview';
import { useEffect, useRef, useState } from 'react';

import { useDocxGenerator } from '../../../../renderer/shared/hooks/useDocxGenerator';
import type { User } from '../../../../shared/types/user';
import { reportError } from '../../../shared/api/errors';
import { personnelApi } from '../../../shared/api/personnel';
import { reportTemplatesApi } from '../../../shared/api/reports';
import { downloadFile } from '../../../shared/lib/download';
import { toast } from '../../../shared/ui/toast';
import { useReportsStore } from '../../report/model/reportsStore';
import DocxPreviewModal from './_components/DocxPreviewModal';
import SavedTemplatesPanel from './_components/SavedTemplatesPanel';
import UserFieldsModal from './_components/UserFieldsModal';
import UserList from './_components/UserList';

/** Fill a DOCX template with a person's data: pick the person, the template, generate. */
export default function SavedReportsTab() {
    const [includedFields, setIncludedFields] = useState<Record<string, boolean>>({});
    const [includedFields2, setIncludedFields2] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [previewTpl, setPreviewTpl] = useState<any | null>(null);
    const [searchUser1, setSearchUser1] = useState('');
    const [searchUser2, setSearchUser2] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [generating, setGenerating] = useState(false);
    const { generateDocx } = useDocxGenerator();

    const { savedTemplates, selectedUserId } = useReportsStore();
    const selectedTemplateId = useReportsStore((s) => s.selectedTemplateId);
    const [users, setUsers] = useState<User[]>([]);
    const [previewBuffer, setPreviewBuffer] = useState<ArrayBuffer | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const additionalFields = useReportsStore((s) => s.additionalInfo);
    const selectedUser2 = users.find((u) => u.id === useReportsStore.getState().selectedUserId2);

    // Unit details for the documents live in the database (they travel with backups).
    useEffect(() => {
        useReportsStore
            .getState()
            .loadAdditionalInfo()
            .catch((error) => reportError(error, { context: 'reports.unit-info' }));
    }, []);
    useEffect(() => {
        if (selectedUser2) {
            const defaultFields = Object.keys(selectedUser2).reduce(
                (acc, key) => {
                    acc[key] = true;
                    return acc;
                },
                {} as Record<string, boolean>,
            );
            setIncludedFields2(defaultFields);
        }
    }, [selectedUser2]);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                setUsers(await personnelApi.list());
            } catch (error) {
                reportError(error, { context: 'reports.users' });
            }
        };
        void loadUsers();
    }, []);

    useEffect(() => {
        const loadDefault = async () => {
            try {
                const templates = await reportTemplatesApi.listBundled();
                useReportsStore.getState().setSavedTemplates([...templates]);
            } catch (error) {
                reportError(error, { context: 'reports.bundled-templates' });
            }
        };

        if (savedTemplates.length === 0) {
            void loadDefault();
        }
    }, []);

    const selectedUser = users.find((u) => u.id === selectedUserId);
    const selectedTemplate = useReportsStore((s) =>
        s.savedTemplates.find((t) => t.id === s.selectedTemplateId),
    );

    useEffect(() => {
        if (selectedUser) {
            const defaultFields = Object.keys(selectedUser).reduce(
                (acc, key) => {
                    acc[key] = true;
                    return acc;
                },
                {} as Record<string, boolean>,
            );
            setIncludedFields(defaultFields);
            setPreviewBuffer(null);
        }
    }, [selectedUser]);
    useEffect(() => {
        setPreviewBuffer(null);
    }, [selectedTemplateId]);

    const handlePreview = (tpl: any) => {
        // DocxPreviewModal renders the template itself.
        setPreviewTpl(tpl);
        setShowPreview(true);
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const buffer = await generateDocx({
                selectedUser,
                includedFields,
                selectedUser2,
                includedFields2,
                selectedTemplate,
                additionalFields,
            });

            if (!buffer) return;

            setPreviewBuffer(buffer);

            if (previewRef.current) {
                previewRef.current.innerHTML = '';
                try {
                    await renderAsync(buffer, previewRef.current);
                    toast.success('Рапорт сформовано — перевірте й завантажте');
                } catch (err) {
                    console.error('Preview render failed:', err);
                    previewRef.current.innerHTML = '';
                    toast.warning(
                        'Рапорт сформовано, але попередній перегляд недоступний. Його можна завантажити.',
                    );
                }
            }
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!previewBuffer) return;

        void downloadFile(previewBuffer, `${selectedTemplate?.name || 'document'}.docx`);
    };

    return (
        <div className="flex min-h-0 flex-1">
            <aside className="flex w-[280px] shrink-0 flex-col border-r border-line bg-surface xl:w-[300px]">
                <UserList
                    users={users}
                    selectedUserId={selectedUserId}
                    searchUser1={searchUser1}
                    setSearchUser1={setSearchUser1}
                    searchUser2={searchUser2}
                    setSearchUser2={setSearchUser2}
                />
            </aside>

            {showAdvanced && (
                <UserFieldsModal
                    open={showAdvanced}
                    onClose={() => setShowAdvanced(false)}
                    usersConfig={[
                        selectedUser && {
                            user: selectedUser,
                            includedFields,
                            setIncludedFields,
                        },
                        selectedUser2 && {
                            user: selectedUser2,
                            includedFields: includedFields2,
                            setIncludedFields: setIncludedFields2,
                        },
                    ].filter(Boolean)}
                />
            )}

            <SavedTemplatesPanel
                savedTemplates={savedTemplates}
                selectedTemplateId={selectedTemplateId}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handlePreview={handlePreview}
                handleGenerate={handleGenerate}
                handleDownload={handleDownload}
                showAdvanced={showAdvanced}
                setShowAdvanced={setShowAdvanced}
                previewBuffer={previewBuffer}
                previewRef={previewRef}
                generating={generating}
                selectedTemplate={selectedTemplate}
                selectedUser={selectedUser}
                selectedUser2={selectedUser2}
            />

            {showPreview && (
                <DocxPreviewModal
                    open={showPreview}
                    template={previewTpl}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </div>
    );
}
