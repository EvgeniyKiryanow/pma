// src/excelTemplates/templatesRegistry.ts
import { generateCombatReportExcel } from './generateCombatReportExcel';
import { generateStaffReportExcel } from './generateStaffReportExcel';

export const excelTemplates = [
    {
        id: 'combat',
        title: '📄 Бойове донесення',
        description: 'Звіт про бойовий та чисельний склад',
        exportFn: generateCombatReportExcel,
    },
    {
        id: 'staff',
        title: '📄 Штатний звіт',
        description: 'Список штатних посад та їх укомплектованість',
        exportFn: generateStaffReportExcel,
    },
    // add more...
];
