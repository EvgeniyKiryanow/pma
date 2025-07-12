import type { User } from '../../../types/user';

type Props = {
    user: User;
    includedFields: Record<string, boolean>;
    setIncludedFields: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    label: string;
    color?: 'green' | 'indigo';
};

export default function UserFields({
    user,
    includedFields,
    setIncludedFields,
    label,
    color = 'indigo',
}: Props) {
    const isSecond = color === 'green';

    return (
        <div
            className={`border rounded-lg p-4 bg-white shadow-sm ${
                isSecond ? 'border-green-300' : ''
            }`}
        >
            <h4
                className={`text-md font-semibold mb-3 ${
                    isSecond
                        ? 'text-green-700 border-b border-green-200 pb-2'
                        : 'text-gray-800 border-b pb-2'
                }`}
            >
                {label}
            </h4>
            <div className="space-y-2">
                {Object.keys(includedFields).map((field) => {
                    const value = user?.[field as keyof User];
                    if (
                        value == null ||
                        (typeof value === 'string' && value.trim() === '') ||
                        (Array.isArray(value) && value.length === 0)
                    )
                        return null;

                    return (
                        <label
                            key={field}
                            className={`flex items-center gap-3 p-2 border rounded-md transition cursor-pointer ${
                                isSecond ? 'border-green-100 hover:bg-green-50' : 'hover:bg-gray-50'
                            }`}
                        >
                            <input
                                type="checkbox"
                                className={`h-4 w-4 rounded border-gray-300 focus:ring-${
                                    isSecond ? 'green' : 'indigo'
                                }-500 text-${isSecond ? 'green' : 'indigo'}-600`}
                                checked={includedFields[field]}
                                onChange={() =>
                                    setIncludedFields((prev) => ({
                                        ...prev,
                                        [field]: !prev[field],
                                    }))
                                }
                            />
                            <span className="text-sm text-gray-800">{field}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}
