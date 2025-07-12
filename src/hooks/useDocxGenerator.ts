/* eslint-disable @typescript-eslint/ban-ts-comment */
// hooks/useDocxGenerator.ts
import { useReportsStore } from '../stores/reportsStore';
import generateFullNameForms from '../helpers/fullNameConverting';
import flattenFullNameForms from '../helpers/flattenNameConverting';
import getImageOptions from '../helpers/imageOptionHelper';

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
// @ts-ignore
import ImageModule from 'docxtemplater-image-module-free';
import { GrammaticalGender } from 'shevchenko';

export function useDocxGenerator() {
    const generateDocx = async ({
        selectedUser,
        includedFields,
        selectedUser2,
        includedFields2,
        selectedTemplate,
    }: {
        selectedUser: any;
        includedFields: Record<string, boolean>;
        selectedUser2: any;
        includedFields2: Record<string, boolean>;
        selectedTemplate: any;
    }): Promise<ArrayBuffer | null> => {
        if (!selectedTemplate || !selectedUser) {
            alert('❌ Шаблон або користувач не вибраний!');
            return null;
        }

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

            const fullNameForms = await generateFullNameForms(
                selectedUser.fullName,
                GrammaticalGender.MASCULINE,
            );
            const flattenedFullName = flattenFullNameForms(
                fullNameForms,
                !!includedFields.fullName,
            );

            const filteredUserData = Object.entries(selectedUser).reduce(
                (acc, [key, value]) => {
                    acc[key] = includedFields[key] ? (value ?? '') : '';
                    return acc;
                },
                {} as Record<string, any>,
            );

            let filteredUserData2: Record<string, any> = {};
            let flattenedFullName2: Record<string, string> = {};

            if (selectedUser2) {
                const fullNameForms2 = await generateFullNameForms(
                    selectedUser2.fullName,
                    GrammaticalGender.MASCULINE,
                );
                flattenedFullName2 = Object.fromEntries(
                    Object.entries(
                        flattenFullNameForms(fullNameForms2, !!includedFields2.fullName),
                    ).map(([key, val]) => [`${key}2`, val]),
                );

                filteredUserData2 = Object.entries(selectedUser2).reduce(
                    (acc, [key, value]) => {
                        acc[`${key}2`] = includedFields2[key] ? (value ?? '') : '';
                        return acc;
                    },
                    {} as Record<string, any>,
                );
            }

            doc.setData({
                ...filteredUserData,
                ...flattenedFullName,
                ...filteredUserData2,
                ...flattenedFullName2,
            });

            doc.render();
            alert('✅ Шаблон успішно згенеровано!');
            return doc.getZip().generate({ type: 'arraybuffer' });
        } catch (err) {
            console.error('⚠️ Template generation failed:', err);
            alert('❌ Помилка генерації шаблону.');
            return null;
        }
    };

    return { generateDocx };
}
