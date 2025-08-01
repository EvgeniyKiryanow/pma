/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useReportsStore } from '../../stores/reportsStore';
import { useI18nStore } from '../../stores/i18nStore';
import { useEffect, useState, useRef } from 'react';
import type { User } from '../../types/user';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { renderAsync } from 'docx-preview';
// @ts-ignore
import UserList from './_components/UserList';
import DocxPreviewModal from './_components/DocxPreviewModal';
import SavedTemplatesPanel from './_components/SavedTemplatesPanel';
import { useDocxGenerator } from '../../hooks/useDocxGenerator';
import UserFieldsModal from './_components/UserFieldsModal';

export default function SavedReportsTab() {
    const { t } = useI18nStore();
    // TODO update this file because did not work
    const [includedFields, setIncludedFields] = useState<Record<string, boolean>>({});
    const [includedFields2, setIncludedFields2] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [previewTpl, setPreviewTpl] = useState<any | null>(null);
    const [searchUser1, setSearchUser1] = useState('');
    const [searchUser2, setSearchUser2] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const { generateDocx } = useDocxGenerator();

    const { savedTemplates, selectedUserId, setSelectedUser, setSelectedTemplate } =
        useReportsStore();
    const selectedTemplateId = useReportsStore((s) => s.selectedTemplateId);
    const [users, setUsers] = useState<User[]>([]);
    const [previewBuffer, setPreviewBuffer] = useState<ArrayBuffer | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const additionalFields = useReportsStore.getState().additionalInfo;
    const selectedUser2 = users.find((u) => u.id === useReportsStore.getState().selectedUserId2);
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
            const data = await window.electronAPI.fetchUsersMetadata();
            setUsers(data);
        };
        loadUsers();
    }, []);

    useEffect(() => {
        const loadDefault = async () => {
            try {
                const template = await window.electronAPI.getAllReportTemplates();
                useReportsStore.getState().setSavedTemplates([...template]);
            } catch (e) {
                console.error('Failed to load default template:', e);
            }
        };

        if (savedTemplates.length === 0) {
            loadDefault();
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
        setPreviewTpl(tpl);
        setShowPreview(true);

        setTimeout(() => {
            const container = document.getElementById('docx-preview-container');
            if (container && tpl?.content) {
                container.innerHTML = 'Loading preview...';
                const zip = new PizZip(tpl.content);
                const doc = new Docxtemplater(zip);
                try {
                    doc.render();
                    const buffer = doc.getZip().generate({ type: 'arraybuffer' });
                    renderAsync(buffer, container);
                } catch (err) {
                    container.innerHTML =
                        '<p class="text-red-500">⚠️ Не вдалося відобразити шаблон.</p>';
                }
            }
        }, 0);
    };

    const handleGenerate = async () => {
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
            previewRef.current.innerHTML = 'Loading preview...';
            try {
                await renderAsync(buffer, previewRef.current);
                console.log('✅ DOCX preview rendered');
                alert('✅ Шаблон успішно згенеровано!');
            } catch (err) {
                console.error('❌ Preview render failed:', err);
                previewRef.current.innerHTML = '❌ Не вдалося показати попередній перегляд.';
                alert('⚠️ Помилка під час відображення попереднього перегляду.');
            }
        }
    };

    const handleDownload = () => {
        if (!previewBuffer) return;

        const blob = new Blob([previewBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedTemplate?.name || 'document'}.docx`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex h-full">
            {/* User List */}
            <aside className="w-1/4 border-r p-4 overflow-y-auto bg-gray-50 space-y-6">
                <UserList
                    users={users}
                    selectedUserId={selectedUserId}
                    searchUser1={searchUser1}
                    setSearchUser1={setSearchUser1}
                    searchUser2={searchUser2}
                    setSearchUser2={setSearchUser2}
                />
            </aside>

            {/* Fields Section */}
            {showAdvanced && (
                <div className="flex flex-col gap-6 p-4 w-[280px] max-w-[300px] overflow-y-auto border-r bg-white">
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
                </div>
            )}

            {/* Saved Templates */}
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
