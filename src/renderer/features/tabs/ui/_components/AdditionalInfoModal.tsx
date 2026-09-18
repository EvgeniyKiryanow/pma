import { NotebookPen, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { reportError } from '../../../../shared/api/errors';
import { Button, Modal, TextField } from '../../../../shared/ui';
import { useReportsStore } from '../../../report/model/reportsStore';

type Props = {
    open: boolean;
    onClose: () => void;
};

export default function AdditionalInfoModal({ open, onClose }: Props) {
    const additionalInfo = useReportsStore((s) => s.additionalInfo);
    const setAdditionalInfo = useReportsStore((s) => s.setAdditionalInfo);
    const loadAdditionalInfo = useReportsStore((s) => s.loadAdditionalInfo);

    const [unitName, setUnitName] = useState('старший командир');
    const [commanderName, setCommanderName] = useState('Тополя Евгеній Миколаєвич');

    useEffect(() => {
        if (open) loadAdditionalInfo().catch((err) => reportError(err));
    }, [open, loadAdditionalInfo]);

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
                        onClick={async () => {
                            try {
                                await setAdditionalInfo(null);
                                setUnitName('');
                                setCommanderName('');
                                onClose();
                            } catch (err) {
                                reportError(err);
                            }
                        }}
                    >
                        Видалити
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                        Скасувати
                    </Button>
                    <Button
                        onClick={async () => {
                            try {
                                await setAdditionalInfo({ unitName, commanderName });
                                onClose();
                            } catch (err) {
                                reportError(err);
                            }
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
