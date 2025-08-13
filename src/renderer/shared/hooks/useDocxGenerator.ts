/* eslint-disable @typescript-eslint/ban-ts-comment */
import Docxtemplater from 'docxtemplater';
// @ts-ignore
import ImageModule from 'docxtemplater-image-module-free';
import PizZip from 'pizzip';
import type * as ShevchenkoType from 'shevchenko';

import generateAndFlattenFullNameForms from '../../../shared/helpers/generateAndFlattenFullNameForms';
// import { GrammaticalGender } from 'shevchenko';
import generateAndFlattenTitleForms, {
    extractCasesFromResponse,
} from '../../../shared/helpers/generateAndFlattenTitleForms';
import getImageOptions from '../../../shared/helpers/imageOptionHelper';
import { hideLoader, showLoader } from '../../../shared/helpers/loadersSimple';
let shevPromise: Promise<typeof ShevchenkoType> | null = null;
async function getShevchenkoModule(): Promise<typeof ShevchenkoType> {
    if (!shevPromise) {
        shevPromise = import('shevchenko');
    }
    return shevPromise;
}
export function useDocxGenerator() {
    const generateDocx = async ({
        selectedUser,
        includedFields,
        selectedUser2,
        includedFields2,
        selectedTemplate,
        additionalFields,
    }: {
        selectedUser: any;
        includedFields: Record<string, boolean>;
        selectedUser2: any;
        includedFields2: Record<string, boolean>;
        selectedTemplate: any;
        additionalFields: any;
    }): Promise<ArrayBuffer | null> => {
        if (!selectedTemplate || !selectedUser) {
            alert('❌ Шаблон або користувач не вибраний!');
            return null;
        }

        showLoader('⏳ Генерація шаблону... зачекайте');
        const { commanderName, unitName } = additionalFields;
        const imageOpts = getImageOptions();
        try {
            const zip = new PizZip(selectedTemplate.content);
            const imageModule = new ImageModule(imageOpts);

            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                modules: [imageModule],
                delimiters: { start: '{', end: '}' },
            });
            const shev = await getShevchenkoModule();
            const flattenCommanderFullName = await generateAndFlattenFullNameForms(
                commanderName,
                shev.GrammaticalGender.MASCULINE,
                true,
                'com',
            );

            const flattenedFullName = await generateAndFlattenFullNameForms(
                selectedUser.fullName,
                shev.GrammaticalGender.MASCULINE,
                !!includedFields.fullName,
            );

            const filteredUserData = Object.entries(selectedUser).reduce(
                (acc, [key, value]) => {
                    acc[key] = includedFields[key] ? (value ?? '') : '';
                    return acc;
                },
                {} as Record<string, any>,
            );

            console.log(includedFields2, includedFields, 'includedFields2');
            const { rank, position } = selectedUser;
            const morphologyRank = await window.electronAPI.morphy.analyzeWords(rank);
            const morphologyPosition = await window.electronAPI.morphy.analyzeWords(position);
            const morphologyUnitName = await window.electronAPI.morphy.analyzeWords(unitName);

            const sptitedCasesRank = extractCasesFromResponse(morphologyRank.parts);
            const sptitedCasesPosition = extractCasesFromResponse(morphologyPosition.parts);
            const sptitedCasesUnitName = extractCasesFromResponse(morphologyUnitName.parts);
            const flattenedUnit = generateAndFlattenTitleForms(
                sptitedCasesUnitName,
                {},
                {},
                true,
                'unit',
            );
            const flattenedRank = generateAndFlattenTitleForms(
                sptitedCasesRank,
                {},
                {},
                !!includedFields.rank,
                'rank',
            );

            const flattenedPosition = generateAndFlattenTitleForms(
                {},
                {},
                sptitedCasesPosition,
                !!includedFields.position,
                'pos',
            );

            let filteredUserData2: Record<string, any> = {};
            let flattenedFullName2: Record<string, string> = {};

            // TODO included fields update
            if (selectedUser2) {
                // ✅ Flatten full name with prefix and suffixed keys in one step
                const flattenedFullName2Raw = await generateAndFlattenFullNameForms(
                    selectedUser2.fullName,
                    shev.GrammaticalGender.MASCULINE,
                    !!includedFields2.fullName,
                );

                // ✅ Suffix keys with `2`
                flattenedFullName2 = Object.fromEntries(
                    Object.entries(flattenedFullName2Raw).map(([key, val]) => [`${key}2`, val]),
                );

                // ✅ Filter user data with suffixed keys
                filteredUserData2 = Object.entries(selectedUser2).reduce(
                    (acc, [key, value]) => {
                        acc[`${key}2`] = includedFields2[key] ? (value ?? '') : '';
                        return acc;
                    },
                    {} as Record<string, any>,
                );

                // ✅ Handle morphology for rank and position
                const { rank: rank2, position: position2 } = selectedUser2;

                const morphologyRank2 = await window.electronAPI.morphy.analyzeWords(rank2);
                const morphologyPosition2 = await window.electronAPI.morphy.analyzeWords(position2);

                const sptitedCasesRank2 = extractCasesFromResponse(morphologyRank2.parts);
                const sptitedCasesPosition2 = extractCasesFromResponse(morphologyPosition2.parts);

                const flattenedRank2 = generateAndFlattenTitleForms(
                    sptitedCasesRank2,
                    {},
                    {},
                    !!includedFields2.rank,
                    'rank2',
                );

                const flattenedPosition2 = generateAndFlattenTitleForms(
                    {},
                    {},
                    sptitedCasesPosition2,
                    !!includedFields2.position,
                    'pos2',
                );
                doc.setData({
                    ...filteredUserData,
                    ...flattenedFullName,
                    ...flattenedRank,
                    ...flattenedPosition,
                    ...filteredUserData2,
                    ...flattenedFullName2,
                    ...flattenedRank2,
                    ...flattenedPosition2,
                    ...flattenedUnit,
                    ...flattenCommanderFullName,
                });
            } else {
                doc.setData({
                    ...filteredUserData,
                    ...flattenedFullName,
                    ...flattenedRank,
                    ...flattenedPosition,
                    ...flattenedUnit,
                    ...flattenCommanderFullName,
                });
            }
            console.log(
                flattenedRank,
                flattenedPosition,
                flattenedFullName,
                flattenCommanderFullName,
                flattenedUnit,
                filteredUserData,
            );
            doc.render();
            hideLoader();
            return doc.getZip().generate({ type: 'arraybuffer' });
        } catch (err) {
            hideLoader();
            console.error('⚠️ Template generation failed:', err);
            alert('❌ Помилка генерації шаблону.');
            return null;
        }
    };

    return { generateDocx };
}
