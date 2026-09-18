import { NotebookPen, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button, Modal, TextField } from '../../../../shared/ui';
import { useReportsStore } from '../../../report/model/reportsStore';

type Props = {
    open: boolean;
    onClose: () => void;
};

export default function AdditionalInfoModal({ open, onClose }: Props) {
    const additionalInfo = useReportsStore((s) => s.additionalInfo);
    const setAdditionalInfo = useReportsStore((s) => s.setAdditionalInfo);

    const [unitName, setUnitName] = useState('старший командир');
    const [commanderName, setCommanderName] = useState('Тополя Евгеній Миколаєвич');

    useEffect(() => {
        if (open && additionalInfo) {
            setUnitName(additionalInfo.unitName || '');
            setCommanderName(additionalInfo.commanderName || '');
        }
    }, [open, additionalInfo]);

    if (!open) return null;

    return (
        <Modal
            open
            onClose={onClose}
            title="Уточнюючі дані"
            icon={<NotebookPen />}
            footer={
                <>
                    <Button
                        variant="danger-soft"
                        className="mr-auto"
                        icon={<Trash2 className="size-4" />}
                        onClick={() => {
                            setAdditionalInfo(null);
                            setUnitName('');
                            setCommanderName('');
                            onClose();
                        }}
                    >
                        Видалити
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                        Скасувати
                    </Button>
                    <Button
                        onClick={() => {
                            setAdditionalInfo({ unitName, commanderName });
                            onClose();
                        }}
                    >
                        Зберегти
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <TextField
                    label="Назва підрозділу"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                />
                <TextField
                    label="ПІБ командира, для якого клопотання"
                    value={commanderName}
                    onChange={(e) => setCommanderName(e.target.value)}
                />
            </div>
        </Modal>
    );
}
