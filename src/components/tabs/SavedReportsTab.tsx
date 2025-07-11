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

export default function SavedReportsTab() {
    const { t } = useI18nStore();
    const [includedFields, setIncludedFields] = useState<Record<string, boolean>>({});
    const [includedFields2, setIncludedFields2] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');

    const {
        savedTemplates,
        selectedUserId,
        setSelectedUser,
        setSelectedTemplate,
        selectedTemplateId,
    } = useReportsStore();

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
            setPreviewBuffer(null);
        }
    }, [selectedUser]);
    useEffect(() => {
        setPreviewBuffer(null); // 🧹 Reset preview when template changes
    }, [selectedTemplateId]);
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
            const flattenedFullName = flattenFullNameForms(fullNameForms);

            const filteredUserData = Object.entries(selectedUser).reduce(
                (acc, [key, value]) => {
                    acc[key] = includedFields[key] ? value : '   ';
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
                    Object.entries(flattenFullNameForms(fullNameForms2)).map(([key, val]) => [
                        `${key}2`,
                        val,
                    ]),
                );

                filteredUserData2 = Object.entries(selectedUser2).reduce(
                    (acc, [key, value]) => {
                        acc[`${key}2`] = includedFields[key] ? value : '   ';
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
                <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">
                        {t('reports.selectUser')}
                    </h3>
                    <ul className="space-y-1">
                        {users.map((u) => (
                            <li
                                key={u.id}
                                onClick={() => setSelectedUser(u.id)}
                                className={`cursor-pointer px-3 py-2 rounded-md border transition text-sm ${
                                    selectedUserId === u.id
                                        ? 'bg-blue-100 border-blue-400 font-medium'
                                        : 'hover:bg-blue-50 border-transparent'
                                }`}
                            >
                                👤 {u.fullName}
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">
                        Обрати другого користувача
                    </h3>
                    <ul className="space-y-1">
                        {users.map((u) => (
                            <li
                                key={u.id}
                                onClick={() => useReportsStore.getState().setSelectedUser2(u.id)}
                                className={`cursor-pointer px-3 py-2 rounded-md border transition text-sm ${
                                    useReportsStore.getState().selectedUserId2 === u.id
                                        ? 'bg-green-100 border-green-400 font-medium'
                                        : 'hover:bg-green-50 border-transparent'
                                }`}
                            >
                                👥 {u.fullName}
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>

            {/* Fields Section */}
            <div className="flex flex-col gap-6 p-4 w-[280px] max-w-[300px] overflow-y-auto border-r bg-white">
                {selectedUser && (
                    <div>
                        <h4 className="text-md font-semibold mb-3 text-gray-700">
                            {t('reports.fieldSelection')}
                        </h4>
                        <div className="space-y-2">
                            {Object.keys(includedFields).map((field) => {
                                const value = selectedUser?.[field as keyof typeof selectedUser];
                                if (
                                    value == null ||
                                    (typeof value === 'string' && value.trim() === '') ||
                                    (Array.isArray(value) && value.length === 0)
                                )
                                    return null;
                                return (
                                    <label key={field} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            className="accent-indigo-600"
                                            checked={includedFields[field]}
                                            onChange={() =>
                                                setIncludedFields((prev) => ({
                                                    ...prev,
                                                    [field]: !prev[field],
                                                }))
                                            }
                                        />
                                        <span className="text-gray-700">
                                            {t(`user.${field}`) ?? field}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}
                {selectedUser2 && (
                    <div>
                        <h4 className="text-md font-semibold mb-3 text-gray-700">
                            Поля другого користувача
                        </h4>
                        <div className="space-y-2">
                            {Object.keys(includedFields2).map((field) => {
                                const value = selectedUser2?.[field as keyof typeof selectedUser2];
                                if (
                                    value == null ||
                                    (typeof value === 'string' && value.trim() === '') ||
                                    (Array.isArray(value) && value.length === 0)
                                )
                                    return null;
                                return (
                                    <label key={field} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            className="accent-green-600"
                                            checked={includedFields2[field]}
                                            onChange={() =>
                                                setIncludedFields2((prev) => ({
                                                    ...prev,
                                                    [field]: !prev[field],
                                                }))
                                            }
                                        />
                                        <span className="text-gray-700">
                                            {t(`user.${field}`) ?? field}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Saved Templates */}
            <main className="flex-1 p-6 overflow-y-auto bg-white">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">
                    {t('reports.savedTemplates')}
                </h2>
                <div className="mt-6 flex gap-3 pb-[15px]">
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
                {/* {isPreviewStale && (
                    <p className="text-xs text-red-500 mt-1">
                        🔒 Ви змінили шаблон. Спочатку згенеруйте шаблон перед завантаженням.
                    </p>
                )} */}

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
                    <div className="mb-6">
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {savedTemplates
                                .filter((tpl: any) =>
                                    tpl.name.toLowerCase().includes(searchQuery.toLowerCase()),
                                )
                                .map((tpl: any) => (
                                    <li
                                        key={tpl.id || Date.now()}
                                        onClick={() => {
                                            setSelectedTemplate(tpl.id);
                                        }}
                                        className={`p-4 rounded-lg shadow-sm border transition flex justify-between items-start gap-3 cursor-pointer ${
                                            selectedTemplateId === tpl.id
                                                ? 'bg-blue-50 border-blue-400'
                                                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                                        }`}
                                    >
                                        <div className="flex-1">
                                            <div className="font-semibold text-base text-gray-800 flex items-center gap-1">
                                                📁 {tpl.name}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {new Date(tpl.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                        {selectedTemplateId === tpl.id && (
                                            <CheckCircle className="text-green-600 w-5 h-5 shrink-0 mt-1" />
                                        )}
                                    </li>
                                ))}
                        </ul>
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">{t('reports.noSavedTemplates')}</p>
                )}
            </main>
        </div>
    );
}
