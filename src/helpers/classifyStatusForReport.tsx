export default function classifyStatusForReport(status?: string) {
    if (!status) return { statusInArea: '', absenceReason: '' };

    // ✅ If status is COMBAT / ROTATION / SUPPLY / MGMT
    if (
        status.includes('Позиція') ||
        status.includes('Ротація') ||
        status.includes('Забезпечення') ||
        status.includes('Управління') ||
        status.includes('КСП')
    ) {
        return { statusInArea: status, absenceReason: '' };
    }

    // ✅ If status is ABSENT / NON-COMBAT
    if (
        status.includes('Відпустка') ||
        status.includes('Навчання') ||
        status.includes('Відрядження') ||
        status.includes('Арешт') ||
        status.includes('СЗЧ') ||
        status.includes('Шпиталь') ||
        status.includes('ВЛК') ||
        status === '300' ||
        status === '500' ||
        status === '200' ||
        status.includes('Приданий') ||
        status.includes('лікування') ||
        status.includes('Звільнений') ||
        status.includes('Обмежено придатний') ||
        status.includes('Очікує кадрового рішення') ||
        status.includes('Відмовник')
    ) {
        return { statusInArea: '', absenceReason: status };
    }

    // Default → not classified
    return { statusInArea: '', absenceReason: '' };
}
