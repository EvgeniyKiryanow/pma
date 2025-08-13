import type { RelativeContact } from '../../../../shared/types/user';

export default function UserRelatives({ relatives }: { relatives: RelativeContact[] }) {
    return (
        <div className="mt-6">
            <h3 className="text-xl font-semibold mb-2">Relatives & Contacts/ Родичі та Контакти</h3>
            {relatives.length === 0 ? (
                <p className="text-gray-500">No relatives listed/Без додаткової інформації</p>
            ) : (
                <ul className="space-y-2">
                    {relatives.map((r, idx) => (
                        <li key={idx} className="border p-3 rounded bg-gray-50">
                            <p className="font-medium">{r.name}</p>
                            <p className="text-sm text-gray-600">
                                {r.relationship} | {r.phone || 'No phone'} | {r.email || 'No email'}
                            </p>
                            {r.notes && <p className="text-sm text-gray-500 mt-1">{r.notes}</p>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
