import { useEffect, useState } from 'react';
import { useUserStore } from '../stores/userStore';
import type { User, RelativeContact } from '../types/user';

const labels: [string, string, keyof User][] = [
    ['Full Name', 'ПІБ', 'fullName'],
    ['Email', 'Електронна пошта', 'email'],
    ['Phone Number', 'Номер телефону', 'phoneNumber'],
    ['Date of Birth', 'Дата народження', 'dateOfBirth'],
    ['Position', 'Посада', 'position'],
    ['Rank', 'Звання', 'rank'],
    ['Rights', 'Права', 'rights'],
];

type UserFormModalUpdateProps = {
    userToEdit?: User | null;
    onClose: () => void;
};

export default function UserFormModalUpdate({ userToEdit, onClose }: UserFormModalUpdateProps) {
    const addUser = useUserStore((s) => s.addUser);
    const updateUser = useUserStore((s) => s.updateUser);

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
        photo: '',
        relatives: [],
        comments: [],
        history: [],
    });

    const [photoPreview, setPhotoPreview] = useState<string>('');

    useEffect(() => {
        if (userToEdit) {
            setForm(userToEdit);
            setPhotoPreview(userToEdit.photo || '');
        } else {
            setForm({
                fullName: '',
                dateOfBirth: '',
                position: '',
                rank: '',
                rights: '',
                conscriptionInfo: '',
                notes: '',
                email: '',
                phoneNumber: '',
                photo: '',
                relatives: [],
                comments: [],
                history: [],
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
        const newRelative: RelativeContact = { name: '', relationship: '' };
        setForm((prev) => ({
            ...prev,
            relatives: [...(prev.relatives || []), newRelative],
        }));
    };

    const handleRelativeChange = (index: number, field: keyof RelativeContact, value: string) => {
        const updated = [...(form.relatives || [])];
        updated[index] = {
            ...updated[index],
            [field]: value,
        };
        setForm((prev) => ({ ...prev, relatives: updated }));
    };

    const handleSubmit = () => {
        const finalUser: User = {
            id: userToEdit?.id ?? Date.now(),
            ...form,
            relatives: form.relatives || [],
            comments: form.comments || [],
            history: form.history || [],
        } as User;

        if (isEditing) {
            updateUser(finalUser);
        } else {
            addUser(finalUser);
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-3xl rounded-lg shadow-2xl border overflow-y-auto max-h-[90vh]">
                <div className="px-6 py-5 border-b bg-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 uppercase tracking-wide">
                        {isEditing
                            ? 'Edit Military Personnel / Редагувати'
                            : 'Add Military Personnel / Додати військовослужбовця'}
                    </h2>
                    <button onClick={onClose} className="text-sm text-gray-500 hover:text-red-600">
                        ✕
                    </button>
                </div>

                <div className="px-6 py-4 space-y-6">
                    {/* Photo Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Photo / Фото
                        </label>

                        <div className="relative group">
                            <label
                                htmlFor="photo-upload"
                                className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200"
                            >
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt="Preview"
                                        className="w-full h-full object-cover rounded-lg"
                                    />
                                ) : (
                                    <div className="text-center text-sm text-gray-500">
                                        <span className="block">Click to upload</span>
                                        <span className="text-xs text-gray-400">
                                            Image (JPG/PNG)
                                        </span>
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

                    {/* Main Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        {labels.map(([eng, ukr, key]) => (
                            <div key={key}>
                                <label className="text-sm text-gray-700 block mb-1">
                                    {eng} / {ukr}
                                </label>
                                <input
                                    type={key === 'dateOfBirth' ? 'date' : 'text'}
                                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                                    value={(form[key] as string) || ''}
                                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                />
                            </div>
                        ))}
                        <div className="col-span-2">
                            <label className="text-sm text-gray-700 block mb-1">
                                Conscription Info / Інформація про призов
                            </label>
                            <input
                                className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                                value={form.conscriptionInfo || ''}
                                onChange={(e) =>
                                    setForm({ ...form, conscriptionInfo: e.target.value })
                                }
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm text-gray-700 block mb-1">
                                Notes / Примітки
                            </label>
                            <textarea
                                className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                                rows={3}
                                value={form.notes || ''}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Relatives */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold text-gray-800">
                                Relatives / Родичі
                            </h3>
                            <button
                                type="button"
                                onClick={handleAddRelative}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                + Add Relative / Додати родича
                            </button>
                        </div>
                        {(form.relatives || []).map((rel, idx) => (
                            <div
                                key={idx}
                                className="grid grid-cols-3 gap-3 mb-2 border border-gray-200 p-3 rounded-md"
                            >
                                <input
                                    className="border px-2 py-1 text-sm"
                                    placeholder="Name / Ім'я"
                                    value={rel.name || ''}
                                    onChange={(e) =>
                                        handleRelativeChange(idx, 'name', e.target.value)
                                    }
                                />
                                <input
                                    className="border px-2 py-1 text-sm"
                                    placeholder="Relationship / Стосунок"
                                    value={rel.relationship || ''}
                                    onChange={(e) =>
                                        handleRelativeChange(idx, 'relationship', e.target.value)
                                    }
                                />
                                <input
                                    className="border px-2 py-1 text-sm"
                                    placeholder="Phone / Телефон"
                                    value={rel.phone || ''}
                                    onChange={(e) =>
                                        handleRelativeChange(idx, 'phone', e.target.value)
                                    }
                                />
                            </div>
                        ))}
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end pt-4 border-t border-gray-200 mt-4 gap-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
                        >
                            Cancel / Відмінити
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow"
                        >
                            {isEditing ? 'Save Changes / Зберегти' : 'Add Person / Додати'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
