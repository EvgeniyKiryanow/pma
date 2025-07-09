// Updated with translation and typing improvements
import { useEffect, useState } from 'react';
import { useUserStore } from '../stores/userStore';
import type { User, RelativeContact } from '../types/user';
import { useI18nStore } from '../stores/i18nStore';

export default function UserFormModalUpdate({
    userToEdit,
    onClose,
}: {
    userToEdit?: User | null;
    onClose: () => void;
}) {
    const addUser = useUserStore((s) => s.addUser);
    const updateUser = useUserStore((s) => s.updateUser);
    const { t } = useI18nStore();
    const isEditing = !!userToEdit;

    const [form, setForm] = useState<Partial<User>>({
        fullName: '',
        dateOfBirth: '',
        position: '',
        rank: '',
        rights: '',
        conscriptionInfo: '',
        notes: '',
        email: '',
        phoneNumber: '',
        education: '',
        awards: '',
        photo: '',
        relatives: [],
        comments: [],
        history: [],
        callsign: '',
        passportData: '',
        participantNumber: '',
        identificationNumber: '',
        fitnessCategory: 'Придатний',
        unitNumber: '',
        hasCriminalRecord: false,
        criminalRecordDetails: '',
        militaryTicketInfo: '',
        militaryServiceHistory: '',
        civilProfession: '',
        educationDetails: '',
        residenceAddress: '',
        registeredAddress: '',
        healthConditions: '',
        maritalStatus: '',
        familyInfo: '',
        religion: '',
        recruitingOffice: '',
        driverLicenses: '',
        bloodType: '',
        subdivisionNumber: '',
    });

    const [photoPreview, setPhotoPreview] = useState<string>('');

    useEffect(() => {
        if (userToEdit) {
            setForm(userToEdit);
            setPhotoPreview(userToEdit.photo || '');
        } else {
            setForm({
                ...form,
                fitnessCategory: 'Придатний',
            });
            setPhotoPreview('');
        }
    }, [userToEdit]);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (reader.result) {
                setForm((f) => ({ ...f, photo: reader.result as string }));
                setPhotoPreview(reader.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleAddRelative = () => {
        setForm((prev) => ({
            ...prev,
            relatives: [...(prev.relatives || []), { name: '', relationship: '' }],
        }));
    };

    const handleRelativeChange = (index: number, field: keyof RelativeContact, value: string) => {
        const updated = [...(form.relatives || [])];
        updated[index] = { ...updated[index], [field]: value };
        setForm((prev) => ({ ...prev, relatives: updated }));
    };

    const handleChange = <K extends keyof User>(key: K, value: User[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = () => {
        const finalUser: User = {
            id: userToEdit?.id ?? Date.now(),
            ...form,
            relatives: form.relatives || [],
            comments: form.comments || [],
            history: form.history || [],
        } as User;

        isEditing ? updateUser(finalUser) : addUser(finalUser);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-4xl rounded-lg shadow-2xl border overflow-y-auto max-h-[90vh]">
                <div className="px-6 py-5 border-b bg-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 uppercase tracking-wide">
                        {isEditing ? t('user.editUser') : t('user.addUser')}
                    </h2>
                    <button onClick={onClose} className="text-sm text-gray-500 hover:text-red-600">
                        ✕
                    </button>
                </div>

                <div className="px-6 py-4 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('user.photo')}
                        </label>
                        <div className="relative group">
                            <label
                                htmlFor="photo-upload"
                                className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer"
                            >
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt="Preview"
                                        className="w-full h-full object-cover rounded-lg"
                                    />
                                ) : (
                                    <div className="text-center text-sm text-gray-500">
                                        <span>{t('user.uploadPhoto')}</span>
                                        <span className="text-xs text-gray-400">JPG/PNG</span>
                                    </div>
                                )}
                            </label>
                            <input
                                id="photo-upload"
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                onChange={handlePhotoUpload}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {(Object.keys(form) as (keyof User)[]).map((key) => {
                            if (['photo', 'comments', 'history', 'relatives'].includes(key))
                                return null;

                            if (key === 'hasCriminalRecord') {
                                return (
                                    <div key={key} className="col-span-1 flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={!!form.hasCriminalRecord}
                                            onChange={(e) =>
                                                handleChange('hasCriminalRecord', e.target.checked)
                                            }
                                        />
                                        <label className="text-sm text-gray-700">
                                            {t(`user.${key}`)}
                                        </label>
                                    </div>
                                );
                            }

                            if (key === 'criminalRecordDetails' && !form.hasCriminalRecord)
                                return null;

                            const isTextarea = [
                                'notes',
                                'education',
                                'educationDetails',
                                'militaryTicketInfo',
                                'militaryServiceHistory',
                                'civilProfession',
                                'healthConditions',
                                'criminalRecordDetails',
                                'familyInfo',
                            ].includes(key);

                            return (
                                <div key={key} className="col-span-1">
                                    <label className="text-sm text-gray-700 block mb-1">
                                        {t(`user.${key}`)}
                                    </label>
                                    {isTextarea ? (
                                        <textarea
                                            className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                                            rows={2}
                                            value={String(form[key] || '')}
                                            onChange={(e) => handleChange(key, e.target.value)}
                                        />
                                    ) : (
                                        <input
                                            className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                                            value={String(form[key] || '')}
                                            onChange={(e) => handleChange(key, e.target.value)}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold text-gray-800">
                                {t('user.relatives')}
                            </h3>
                            <button
                                type="button"
                                onClick={handleAddRelative}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                + {t('user.addRelative')}
                            </button>
                        </div>
                        {(form.relatives || []).map((rel, idx) => (
                            <div
                                key={idx}
                                className="grid grid-cols-3 gap-4 mb-2 border p-3 rounded-md"
                            >
                                <input
                                    className="border px-2 py-1 text-sm"
                                    placeholder={t('user.relativeName')}
                                    value={rel.name || ''}
                                    onChange={(e) =>
                                        handleRelativeChange(idx, 'name', e.target.value)
                                    }
                                />
                                <input
                                    className="border px-2 py-1 text-sm"
                                    placeholder={t('user.relativeRelation')}
                                    value={rel.relationship || ''}
                                    onChange={(e) =>
                                        handleRelativeChange(idx, 'relationship', e.target.value)
                                    }
                                />
                                <input
                                    className="border px-2 py-1 text-sm"
                                    placeholder={t('user.relativePhone')}
                                    value={rel.phone || ''}
                                    onChange={(e) =>
                                        handleRelativeChange(idx, 'phone', e.target.value)
                                    }
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-4 border-t mt-4 gap-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
                        >
                            {t('user.cancel')}
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow"
                        >
                            {isEditing ? t('user.save') : t('user.add')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
