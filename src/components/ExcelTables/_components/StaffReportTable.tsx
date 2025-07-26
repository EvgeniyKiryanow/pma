// src/components/_components/StaffReportTable.tsx
export function StaffReportTable() {
    return (
        <thead>
            <tr className="bg-gray-100 text-gray-800 text-sm">
                <th className="border p-2">№</th>
                <th className="border p-2">ПІБ</th>
                <th className="border p-2">Посада</th>
                <th className="border p-2">Підрозділ</th>
            </tr>
            <tr>
                <td className="border p-2">1</td>
                <td className="border p-2">Іваненко Іван Іванович</td>
                <td className="border p-2">Командир роти</td>
                <td className="border p-2">1 рота</td>
            </tr>
            <tr>
                <td className="border p-2">2</td>
                <td className="border p-2">Петренко Петро Петрович</td>
                <td className="border p-2">Стрілець</td>
                <td className="border p-2">1 рота</td>
            </tr>
        </thead>
    );
}
