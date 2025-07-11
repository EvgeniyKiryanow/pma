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
    const [showPreview, setShowPreview] = useState(false);
    const [previewTpl, setPreviewTpl] = useState<any | null>(null);
    const [searchUser1, setSearchUser1] = useState('');
    const [searchUser2, setSearchUser2] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

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
                <div className="border rounded-lg p-3 bg-white shadow-sm mb-4">
                    <h3 className="text-md font-semibold mb-3 text-gray-800 border-b pb-2">
                        {t('reports.selectUser')}
                    </h3>

                    <input
                        type="text"
                        placeholder="🔍 Пошук користувача..."
                        className="w-full mb-3 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                        value={searchUser1}
                        onChange={(e) => setSearchUser1(e.target.value)}
                    />

                    <ul className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                        {users
                            .filter((u) =>
                                u.fullName.toLowerCase().includes(searchUser1.toLowerCase()),
                            )
                            .map((u) => (
                                <li
                                    key={u.id}
                                    onClick={() =>
                                        setSelectedUser(selectedUserId === u.id ? null : u.id)
                                    }
                                    className={`cursor-pointer px-3 py-2 rounded-md border transition text-sm ${
                                        selectedUserId === u.id
                                            ? 'bg-blue-100 border-blue-400 font-medium'
                                            : 'hover:bg-blue-50 border-gray-200'
                                    }`}
                                >
                                    👤 {u.fullName}
                                </li>
                            ))}
                    </ul>
                </div>

                <div className="border rounded-lg p-3 bg-white shadow-sm">
                    <h3 className="text-md font-semibold mb-3 text-gray-800 border-b pb-2">
                        Обрати другого користувача
                    </h3>

                    <input
                        type="text"
                        placeholder="🔍 Пошук другого користувача..."
                        className="w-full mb-3 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-green-300"
                        value={searchUser2}
                        onChange={(e) => setSearchUser2(e.target.value)}
                    />

                    <ul className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                        {users
                            .filter((u) =>
                                u.fullName.toLowerCase().includes(searchUser2.toLowerCase()),
                            )
                            .map((u) => (
                                <li
                                    key={u.id}
                                    onClick={() => {
                                        const currentId =
                                            useReportsStore.getState().selectedUserId2;
                                        useReportsStore
                                            .getState()
                                            .setSelectedUser2(currentId === u.id ? null : u.id);
                                    }}
                                    className={`cursor-pointer px-3 py-2 rounded-md border transition text-sm ${
                                        useReportsStore.getState().selectedUserId2 === u.id
                                            ? 'bg-green-100 border-green-400 font-medium'
                                            : 'hover:bg-green-50 border-gray-200'
                                    }`}
                                >
                                    👥 {u.fullName}
                                </li>
                            ))}
                    </ul>
                </div>
            </aside>

            {/* Fields Section */}
            {showAdvanced && (
                <div className="flex flex-col gap-6 p-4 w-[280px] max-w-[300px] overflow-y-auto border-r bg-white">
                    {selectedUser && (
                        <div className="border rounded-lg p-4 bg-white shadow-sm mb-4">
                            <h4 className="text-md font-semibold mb-3 text-gray-800 border-b pb-2">
                                {t('reports.fieldSelection')}
                            </h4>
                            <div className="space-y-2">
                                {Object.keys(includedFields).map((field) => {
                                    const value =
                                        selectedUser?.[field as keyof typeof selectedUser];
                                    if (
                                        value == null ||
                                        (typeof value === 'string' && value.trim() === '') ||
                                        (Array.isArray(value) && value.length === 0)
                                    )
                                        return null;

                                    return (
                                        <label
                                            key={field}
                                            className="flex items-center gap-3 p-2 border rounded-md hover:bg-gray-50 transition cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                checked={includedFields[field]}
                                                onChange={() =>
                                                    setIncludedFields((prev) => ({
                                                        ...prev,
                                                        [field]: !prev[field],
                                                    }))
                                                }
                                            />
                                            <span className="text-sm text-gray-800">
                                                {t(`user.${field}`) ?? field}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {selectedUser2 && (
                        <div className="border border-green-300 rounded-lg p-4 bg-white shadow-sm">
                            <h4 className="text-md font-semibold mb-3 text-green-700 border-b border-green-200 pb-2">
                                Поля другого користувача
                            </h4>
                            <div className="space-y-2">
                                {Object.keys(includedFields2).map((field) => {
                                    const value =
                                        selectedUser2?.[field as keyof typeof selectedUser2];
                                    if (
                                        value == null ||
                                        (typeof value === 'string' && value.trim() === '') ||
                                        (Array.isArray(value) && value.length === 0)
                                    )
                                        return null;

                                    return (
                                        <label
                                            key={field}
                                            className="flex items-center gap-3 p-2 border border-green-100 rounded-md hover:bg-green-50 transition cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                                                checked={includedFields2[field]}
                                                onChange={() =>
                                                    setIncludedFields2((prev) => ({
                                                        ...prev,
                                                        [field]: !prev[field],
                                                    }))
                                                }
                                            />
                                            <span className="text-sm text-gray-800">
                                                {t(`user.${field}`) ?? field}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
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
                    <div className="mb-6">
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {savedTemplates
                                .filter((tpl: any) =>
                                    tpl.name.toLowerCase().includes(searchQuery.toLowerCase()),
                                )
                                .map((tpl: any) => (
                                    <li
                                        key={tpl.id || Date.now()}
                                        className={`p-4 rounded-lg shadow-sm border transition flex flex-col gap-3 cursor-pointer ${
                                            selectedTemplateId === tpl.id
                                                ? 'bg-blue-50 border-blue-400'
                                                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-3">
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
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => handlePreview(tpl)}
                                                className="px-3 py-1 text-sm font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition"
                                            >
                                                🔍 Попередній перегляд
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setSelectedTemplate(
                                                        selectedTemplateId === tpl.id
                                                            ? null
                                                            : tpl.id,
                                                    )
                                                }
                                                className="px-3 py-1 text-sm font-medium text-gray-700 border border-gray-200 rounded hover:bg-gray-100 transition"
                                            >
                                                ✅ Обрати
                                            </button>
                                        </div>
                                    </li>
                                ))}
                        </ul>
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">{t('reports.noSavedTemplates')}</p>
                )}
            </main>
            {/* preview */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white shadow-xl rounded-lg max-w-4xl w-full mx-4 relative overflow-hidden animate-fade-in">
                        <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-100">
                            <h3 className="text-lg font-medium text-gray-800 mb-1">
                                Попередній перегляд:{' '}
                                <span className="font-semibold">{previewTpl?.name}</span>
                            </h3>
                            <p className="text-sm text-gray-500 mb-3">
                                ⚠️ Увага: Це лише приблизний попередній перегляд. Відображення,
                                стилі та відступи відрізняються від фінального документу.
                            </p>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                            >
                                &times;
                            </button>
                        </div>
                        <div
                            id="docx-preview-container"
                            className="p-4 overflow-auto max-h-[75vh] bg-white text-sm"
                        >
                            <p className="text-gray-500">⏳ Завантаження...</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
