/* eslint-disable @typescript-eslint/ban-ts-comment */
import Docxtemplater from 'docxtemplater';
// @ts-ignore
import ImageModule from 'docxtemplater-image-module-free';
import PizZip from 'pizzip';
import type * as ShevchenkoType from 'shevchenko';

import generateAndFlattenFullNameForms from '../../../shared/helpers/generateAndFlattenFullNameForms';
import generateAndFlattenTitleForms from '../../../shared/helpers/generateAndFlattenTitleForms';
import getImageOptions from '../../../shared/helpers/imageOptionHelper';
import { declineRank } from '../../../shared/helpers/militaryRanks';
import { buildPositionForms, buildUnitForms } from '../../../shared/helpers/positionForms';
import { runBlocking } from '../ui/blockingTask';
import { toast } from '../ui/toast';

let shevPromise: Promise<typeof ShevchenkoType> | null = null;
async function getShevchenkoModule(): Promise<typeof ShevchenkoType> {
    if (!shevPromise) shevPromise = import('shevchenko');
    return shevPromise;
}

const MONTHS_GENITIVE = [
    'січня',
    'лютого',
    'березня',
    'квітня',
    'травня',
    'червня',
    'липня',
    'серпня',
    'вересня',
    'жовтня',
    'листопада',
    'грудня',
];

/** Date placeholders: {date_full}, {date_d}, {date_m}, {date_y}. */
function buildDateFields(now = new Date()): Record<string, string> {
    const day = String(now.getDate());
    const month = MONTHS_GENITIVE[now.getMonth()];
    const year = String(now.getFullYear());
    return {
        date_d: day,
        date_dd: day.padStart(2, '0'),
        date_m: month,
        date_mm: String(now.getMonth() + 1).padStart(2, '0'),
        date_y: year,
        date_full: `${day} ${month} ${year} року`,
        date_iso: now.toISOString().slice(0, 10),
    };
}

/** Raw database fields of a person, limited to the fields selected in "Вибір полів". */
function pickUserFields(
    user: Record<string, any>,
    includedFields: Record<string, boolean>,
    suffix = '',
): Record<string, string> {
    const includesNothing = Object.keys(includedFields || {}).length === 0;
    return Object.entries(user).reduce<Record<string, string>>((acc, [key, value]) => {
        const include = includesNothing ? true : Boolean(includedFields[key]);
        const plain =
            value === null || value === undefined || typeof value === 'object' ? '' : String(value);
        acc[`${key}${suffix}`] = include ? plain : '';
        return acc;
    }, {});
}

type GenerateArgs = {
    selectedUser: any;
    includedFields: Record<string, boolean>;
    selectedUser2: any;
    includedFields2: Record<string, boolean>;
    selectedTemplate: any;
    additionalFields: { commanderName?: string; unitName?: string } | null | undefined;
};

/**
 * Fills a DOCX template with the person's data.
 *
 * Placeholders (delimiters `{ }`):
 *   {fullName}, {rank}, {taxId}, ...  — database fields as they are
 *   {fn_n} {fn_g} {fn_d} {fn_a} {fn_l} {fn_v} (+ …U for upper case) — full name by case
 *   {rank_*}, {pos_*}, {unit_*}       — rank / position / unit by case
 *   {com_*}                           — commander's name by case
 *   {date_full}, {date_d}, {date_m}, {date_y}
 *   the same with the suffix/prefix `2` for the second person ({fullName2}, {fn2_g}, …)
 *
 * Ranks are declined by a built-in dictionary; position cases come from the imported Excel
 * columns; the unit name is used exactly as entered in "Додаткова інформація".
 */
export function useDocxGenerator() {
    const generateDocx = async ({
        selectedUser,
        includedFields,
        selectedUser2,
        includedFields2,
        selectedTemplate,
        additionalFields,
    }: GenerateArgs): Promise<ArrayBuffer | null> => {
        if (!selectedTemplate || !selectedUser) {
            toast.warning('Оберіть шаблон і військовослужбовця.');
            return null;
        }
        if (!selectedTemplate.content) {
            toast.warning('Файл шаблону не завантажено. Оновіть список шаблонів.');
            return null;
        }

        try {
            return await runBlocking('Генерація рапорту… зачекайте', async () => {
                const { commanderName = '', unitName = '' } = additionalFields ?? {};
                const shev = await getShevchenkoModule();
                const gender =
                    String(selectedUser.gender || '').toLowerCase() === 'female'
                        ? shev.GrammaticalGender.FEMININE
                        : shev.GrammaticalGender.MASCULINE;

                const doc = new Docxtemplater(new PizZip(selectedTemplate.content), {
                    paragraphLoop: true,
                    linebreaks: true,
                    modules: [new ImageModule(getImageOptions())],
                    delimiters: { start: '{', end: '}' },
                    nullGetter: () => '',
                });

                const data: Record<string, any> = {
                    ...pickUserFields(selectedUser, includedFields),
                    ...(await generateAndFlattenFullNameForms(
                        selectedUser.fullName,
                        gender,
                        true,
                        'fn',
                    )),
                    ...generateAndFlattenTitleForms(
                        declineRank(selectedUser.rank),
                        {},
                        {},
                        true,
                        'rank',
                    ),
                    ...generateAndFlattenTitleForms(
                        {},
                        buildPositionForms(selectedUser),
                        {},
                        true,
                        'pos',
                    ),
                    ...generateAndFlattenTitleForms({}, {}, buildUnitForms(unitName), true, 'unit'),
                    ...buildDateFields(),
                };

                if (commanderName.trim()) {
                    Object.assign(
                        data,
                        await generateAndFlattenFullNameForms(
                            commanderName,
                            shev.GrammaticalGender.MASCULINE,
                            true,
                            'com',
                        ),
                    );
                }

                if (selectedUser2) {
                    const gender2 =
                        String(selectedUser2.gender || '').toLowerCase() === 'female'
                            ? shev.GrammaticalGender.FEMININE
                            : shev.GrammaticalGender.MASCULINE;
                    Object.assign(
                        data,
                        pickUserFields(selectedUser2, includedFields2, '2'),
                        await generateAndFlattenFullNameForms(
                            selectedUser2.fullName,
                            gender2,
                            true,
                            'fn2',
                        ),
                        generateAndFlattenTitleForms(
                            declineRank(selectedUser2.rank),
                            {},
                            {},
                            true,
                            'rank2',
                        ),
                        generateAndFlattenTitleForms(
                            {},
                            buildPositionForms(selectedUser2),
                            {},
                            true,
                            'pos2',
                        ),
                    );
                }

                doc.setData(data);
                doc.render();
                return doc.getZip().generate({ type: 'arraybuffer' }) as ArrayBuffer;
            });
        } catch (error: any) {
            // docxtemplater reports the offending placeholder in `properties.errors`
            const details = (error?.properties?.errors ?? [])
                .map((e: any) => e?.properties?.explanation || e?.message)
                .filter(Boolean)
                .slice(0, 3)
                .join('; ');
            console.error('Template generation failed', error);
            toast.error(`Не вдалося створити рапорт.${details ? `\n${details}` : ''}`);
            return null;
        }
    };

    return { generateDocx };
}
