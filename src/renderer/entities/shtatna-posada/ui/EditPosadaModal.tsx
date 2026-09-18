import { Pencil } from 'lucide-react';

import { Button, Modal, TextField } from '../../../shared/ui';
import { ShtatnaPosada } from '../model/useShtatniStore';

type Props = {
    form: Partial<ShtatnaPosada>;
    setForm: (val: Partial<ShtatnaPosada>) => void;
    onSave: () => void;
    onClose: () => void;
};

export default function EditPosadaModal({ form, setForm, onSave, onClose }: Props) {
    return (
        <Modal
            open
            onClose={onClose}
            title="Редагувати посаду"
            description={form.shtat_number ? `№ ${form.shtat_number}` : undefined}
            icon={<Pencil />}
            width="max-w-md"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Скасувати
                    </Button>
                    <Button onClick={onSave}>Зберегти</Button>
                </>
            }
        >
            <div className="space-y-4">
                <TextField
                    label="Підрозділ"
                    value={form.unit_name ?? ''}
                    onChange={(e) => setForm({ ...form, unit_name: e.target.value })}
                />
                <TextField
                    label="Посада"
                    value={form.position_name ?? ''}
                    onChange={(e) => setForm({ ...form, position_name: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                    <TextField
                        label="Категорія"
                        value={form.category ?? ''}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                    />
                    <TextField
                        label="ШПК"
                        value={form.shpk_code ?? ''}
                        onChange={(e) => setForm({ ...form, shpk_code: e.target.value })}
                    />
                </div>
            </div>
        </Modal>
    );
}
