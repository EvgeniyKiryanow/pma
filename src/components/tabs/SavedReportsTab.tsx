/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useReportsStore } from '../../stores/reportsStore';
import { useI18nStore } from '../../stores/i18nStore';
import { useEffect, useState, useRef } from 'react';
import type { User } from '../../types/user';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { renderAsync } from 'docx-preview';
// @ts-ignore
import ImageModule from 'docxtemplater-image-module-free';
import { CheckCircle } from 'lucide-react';
import generateFullNameForms from '../../helpers/fullNameConverting';
import flattenFullNameForms from '../../helpers/flattenNameConverting';
import getImageOptions from '../../helpers/imageOptionHelper';
import UserFields from './_components/UserFields';
import UserList from './_components/UserList';
import SavedTemplatesList from './_components/SavedTemplatesList';
import DocxPreviewModal from './_components/DocxPreviewModal';

export default function SavedReportsTab() {
    const { t } = useI18nStore();
    const [includedFields, setIncludedFields] = useState<Record<string, boolean>>({});
    const [includedFields2, setIncludedFields2] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [previewTpl, setPreviewTpl] = useState<any | null>(null);
    const [searchUser1, setSearchUser1] = useState('');
    const [searchUser2, setSearchUser2] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const { savedTemplates, selectedUserId, setSelectedUser, setSelectedTemplate } =
        useReportsStore();
    const selectedTemplateId = useReportsStore((s) => s.selectedTemplateId);
    const [users, setUsers] = useState<User[]>([]);
    const [previewBuffer, setPreviewBuffer] = useState<ArrayBuffer | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);

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
            const data = await window.electronAPI.fetchUsers();
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
        if (!selectedTemplate || !selectedUser) {
            alert('❌ Шаблон або користувач не вибраний!');
            return;
        }

        const imageOpts = getImageOptions();

        try {
            const zip = new PizZip(selectedTemplate.content);
            const imageModule = new ImageModule(imageOpts);

            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                modules: [imageModule],
                delimiters: { start: '{', end: '}' },
            });

            // 🟢 First user
            const fullNameForms = await generateFullNameForms(selectedUser.fullName);
            const flattenedFullName = flattenFullNameForms(
                fullNameForms,
                !!includedFields.fullName,
            );

            const filteredUserData = Object.entries(selectedUser).reduce(
                (acc, [key, value]) => {
                    acc[key] = includedFields[key] ? (value ?? '') : '';
                    return acc;
                },
                {} as Record<string, any>,
            );

            // 🟢 Second user
            const selectedUser2 = users.find(
                (u) => u.id === useReportsStore.getState().selectedUserId2,
            );
            let filteredUserData2: Record<string, any> = {};
            let flattenedFullName2: Record<string, string> = {};

            if (selectedUser2) {
                const fullNameForms2 = await generateFullNameForms(selectedUser2.fullName);
                flattenedFullName2 = Object.fromEntries(
                    Object.entries(
                        flattenFullNameForms(fullNameForms2, !!includedFields2.fullName),
                    ).map(([key, val]) => [`${key}2`, val]),
                );

                filteredUserData2 = Object.entries(selectedUser2).reduce(
                    (acc, [key, value]) => {
                        acc[`${key}2`] = includedFields2[key] ? (value ?? '') : '';
                        return acc;
                    },
                    {} as Record<string, any>,
                );
            }

            doc.setData({
                ...filteredUserData,
                ...flattenedFullName,
                ...filteredUserData2,
                ...flattenedFullName2,
            });

            doc.render();

            const buffer = doc.getZip().generate({ type: 'arraybuffer' });
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
            alert('✅ Шаблон успішно згенеровано!');
        } catch (err) {
            console.error('⚠️ Template generation failed:', err);
            alert('❌ Помилка генерації шаблону.');
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
                    {selectedUser && (
                        <UserFields
                            user={selectedUser}
                            includedFields={includedFields}
                            setIncludedFields={setIncludedFields}
                            label="Поля користувача"
                            color="indigo"
                        />
                    )}

                    {selectedUser2 && (
                        <UserFields
                            user={selectedUser2}
                            includedFields={includedFields2}
                            setIncludedFields={setIncludedFields2}
                            label="Поля другого користувача"
                            color="green"
                        />
                    )}
                </div>
            )}

            {/* Saved Templates */}
            <main className="flex-1 p-6 overflow-y-auto bg-white">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">
                    {t('reports.savedTemplates')}
                </h2>
                <div className="mt-6 flex flex-wrap gap-3 pb-[15px] items-center">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        disabled={!selectedUser && !selectedUser2}
                        className={`px-4 py-2 rounded-md border font-medium text-sm transition 
        ${
            !selectedUser && !selectedUser2
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'text-gray-700 border-gray-300 hover:bg-gray-100'
        }`}
                    >
                        {showAdvanced ? '⬆️ Приховати поля' : '⚙️ Розширені налаштування'}
                    </button>

                    <button
                        onClick={handleGenerate}
                        disabled={!selectedUser || !selectedTemplate}
                        className={`px-4 py-2 rounded-md text-white font-medium text-sm transition ${
                            !selectedUser || !selectedTemplate
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                    >
                        {t('reports.generateFilledTemplate')}
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={!previewBuffer}
                        className={`px-4 py-2 rounded-md text-white font-medium text-sm transition ${
                            !previewBuffer
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        {t('reports.download')}
                    </button>
                </div>

                <div className="mt-4 mb-2">
                    <input
                        type="text"
                        placeholder={t('reports.searchTemplates') || 'Пошук шаблону...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                {savedTemplates.length > 0 ? (
                    <SavedTemplatesList
                        templates={savedTemplates}
                        selectedTemplateId={selectedTemplateId}
                        searchQuery={searchQuery}
                        handlePreview={handlePreview}
                    />
                ) : (
                    <p className="text-gray-500 text-sm">{t('reports.noSavedTemplates')}</p>
                )}
            </main>
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
