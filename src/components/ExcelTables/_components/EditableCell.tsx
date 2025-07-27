import React, { useState } from 'react';
import { useCombatReportStore } from '../../../stores/combatAlternativeReportStore';

type EditableCellProps = {
    unitName: string;
    field: string;
    initialValue: number;
    style?: React.CSSProperties; // <— NEW: pass custom styles
    className?: string; // <— also allow className
};

export const EditableCell: React.FC<EditableCellProps> = ({
    unitName,
    field,
    initialValue,
    style,
    className = 'border border-black text-center',
}) => {
    const { overrides, setOverride } = useCombatReportStore();
    const [isEditing, setEditing] = useState(false);

    const key = `${unitName}:${field}`;
    const currentValue = overrides[key] ?? initialValue;

    const handleSave = (val: string) => {
        const num = parseInt(val, 10) || 0;
        setOverride(key, num);
        setEditing(false);
    };

    if (isEditing) {
        return (
            <td style={style} className={className}>
                <input
                    type="number"
                    autoFocus
                    defaultValue={currentValue}
                    onBlur={(e) => handleSave(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleSave((e.target as HTMLInputElement).value);
                        }
                    }}
                    className="w-full text-center outline-none"
                />
            </td>
        );
    }

    return (
        <td
            style={{ ...style, cursor: 'pointer' }}
            className={className}
            onDoubleClick={() => setEditing(true)}
        >
            {currentValue}
        </td>
    );
};
