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

function flattenFullNameForms(fullNameForms: Record<string, string>) {
    const flat: Record<string, string> = {};
    for (const [key, value] of Object.entries(fullNameForms)) {
        flat[`fullName_${key}`] = value;
    }
    return flat;
}
export default function SavedReportsTab() {
    const { t } = useI18nStore();
    const [includedFields, setIncludedFields] = useState<Record<string, boolean>>({});

    const {
        savedTemplates,
        selectedUserId,
        setSelectedUser,
        setSelectedTemplate,
        selectedTemplateId,
        setSavedTemplates,
    } = useReportsStore();

    const [users, setUsers] = useState<User[]>([]);
    const [previewBuffer, setPreviewBuffer] = useState<ArrayBuffer | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);

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
    const selectedTemplate = savedTemplates.find((t) => t.id === selectedTemplateId);
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
        }
    }, [selectedUser]);
    const handleGenerate = async () => {
        if (!selectedTemplate || !selectedUser) return;

        const imageOpts = {
            centered: false,
            getImage: function (tagValue: string) {
                const base64Data = tagValue.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
                const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
                return buffer;
            },
            getSize: function () {
                return [250, 250];
            },
        };

        try {
            const zip = new PizZip(selectedTemplate.content);
            const imageModule = new ImageModule(imageOpts);

            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                modules: [imageModule],
                delimiters: { start: '{', end: '}' },
            });

            const fullNameForms = await generateFullNameForms(selectedUser.fullName);
            console.log(fullNameForms, 'fullNameForms');
            // accusative
            // :
            // "Кирила Шапкина Олексійовича"
            // dative
            // :
            // "Кирилу Шапкину Олексійовичу"
            // genitive
            // :
            // "Кирила Шапкина Олексійовича"
            // locative
            // :
            // "Кирилові Шапкинові Олексійовичу"
            // nominative
            // :
            // "Кирило Шапкин Олексійович"
            // vocative
            // :
            // "Кириле Шапкине Олексійовичу"
            const flattenedFullName = flattenFullNameForms(fullNameForms);
            const filteredUserData = Object.entries(selectedUser).reduce(
                (acc, [key, value]) => {
                    acc[key] = includedFields[key] ? value : '   ';
                    return acc;
                },
                {} as Record<string, any>,
            );

            doc.setData({
                ...filteredUserData,
                ...flattenedFullName,
            });

            doc.render();

            const buffer = doc.getZip().generate({ type: 'arraybuffer' });
            setPreviewBuffer(buffer);

            if (previewRef.current) {
                previewRef.current.innerHTML = 'Loading preview...';
                try {
                    await renderAsync(buffer, previewRef.current);
                    console.log('✅ DOCX preview rendered');
                } catch (err) {
                    console.error('❌ Preview render failed:', err);
                    previewRef.current.innerHTML = '❌ Failed to render preview.';
                }
            }
        } catch (err) {
            console.error('⚠️ Template generation failed:', err);
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
            <aside className="w-1/4 border-r p-4 overflow-y-auto bg-gray-50">
                <h3 className="text-lg font-semibold mb-3">{t('reports.selectUser')}</h3>
                <ul className="space-y-2">
                    {users.map((u) => (
                        <li
                            key={u.id}
                            onClick={() => setSelectedUser(u.id)}
                            className={`cursor-pointer p-2 rounded hover:bg-blue-100 transition ${
                                selectedUserId === u.id ? 'bg-blue-200 font-medium' : ''
                            }`}
                        >
                            {u.fullName}
                        </li>
                    ))}
                </ul>
            </aside>

            {selectedUser && (
                <div className="border-b ml-[15px]">
                    <h4 className="text-lg font-semibold mb-2 text-gray-800">
                        {t('reports.fieldSelection')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-2 max-h-140 overflow-y-auto">
                        {Object.keys(includedFields).map((field) => (
                            <div key={field} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={includedFields[field]}
                                    onChange={() =>
                                        setIncludedFields((prev) => ({
                                            ...prev,
                                            [field]: !prev[field],
                                        }))
                                    }
                                />
                                <label className="text-sm text-gray-700">
                                    {t(`user.${field}`) ?? field}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Saved Templates */}
            <main className="flex-1 p-6 overflow-y-auto bg-white">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">
                    {t('reports.savedTemplates')}
                </h2>
                {savedTemplates.length > 0 ? (
                    <div className="mb-6">
                        <ul className="space-y-2 text-sm text-gray-700">
                            {savedTemplates.map((tpl: any) => (
                                <li
                                    key={tpl.id || Date.now}
                                    onClick={() => setSelectedTemplate(tpl.id)}
                                    className={`border p-3 rounded shadow-sm bg-gray-50 hover:bg-gray-100 cursor-pointer flex items-center justify-between ${
                                        selectedTemplateId === tpl.id
                                            ? 'border-blue-400 bg-blue-50'
                                            : ''
                                    }`}
                                >
                                    <div>
                                        <div className="font-medium">📁 {tpl.name}</div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(tpl.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                    {selectedTemplateId === tpl.id && (
                                        <CheckCircle className="text-green-600 w-5 h-5" />
                                    )}
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={handleGenerate}
                                disabled={!selectedUser || !selectedTemplate}
                                className={`px-4 py-2 rounded text-white transition ${
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
                                className={`px-4 py-2 rounded text-white transition ${
                                    !previewBuffer
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700'
                                }`}
                            >
                                {t('reports.download')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500">{t('reports.noSavedTemplates')}</p>
                )}

                {/* {previewBuffer && (
                    <div className="mt-6">
                        <h4 className="text-md font-semibold mb-3 text-gray-700">
                            {t('reports.previewTitle')} – {selectedTemplate?.name}
                        </h4>
                        <div
                            ref={previewRef}
                            className="bg-white border rounded shadow p-4 overflow-auto max-h-[600px]"
                        />
                    </div>
                )} */}
            </main>
        </div>
    );
}
