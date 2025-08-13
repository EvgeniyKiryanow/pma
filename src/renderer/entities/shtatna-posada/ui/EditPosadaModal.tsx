// components/EditPosadaModal.tsx
import { ShtatnaPosada } from '../../../../stores/useShtatniStore';

type Props = {
    form: Partial<ShtatnaPosada>;
    setForm: (val: Partial<ShtatnaPosada>) => void;
    onSave: () => void;
    onClose: () => void;
};

export default function EditPosadaModal({ form, setForm, onSave, onClose }: Props) {
    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-[400px]">
                <h3 className="text-lg font-semibold mb-4">Редагувати посаду</h3>

                <div className="space-y-3">
                    <label className="block text-sm">
                        Підрозділ
                        <input
                            className="w-full mt-1 border rounded p-2"
                            value={form.unit_name ?? ''}
                            onChange={(e) => setForm({ ...form, unit_name: e.target.value })}
                        />
                    </label>
                    <label className="block text-sm">
                        Посада
                        <input
                            className="w-full mt-1 border rounded p-2"
                            value={form.position_name ?? ''}
                            onChange={(e) => setForm({ ...form, position_name: e.target.value })}
                        />
                    </label>
                    <label className="block text-sm">
                        Категорія
                        <input
                            className="w-full mt-1 border rounded p-2"
                            value={form.category ?? ''}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                        />
                    </label>
                    <label className="block text-sm">
                        ШПК
                        <input
                            className="w-full mt-1 border rounded p-2"
                            value={form.shpk_code ?? ''}
                            onChange={(e) => setForm({ ...form, shpk_code: e.target.value })}
                        />
                    </label>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                    <button
                        className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                        onClick={onClose}
                    >
                        Скасувати
                    </button>
                    <button
                        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                        onClick={onSave}
                    >
                        Зберегти
                    </button>
                </div>
            </div>
        </div>
    );
}
