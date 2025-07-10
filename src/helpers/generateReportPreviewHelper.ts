/* eslint-disable @typescript-eslint/ban-ts-comment */
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
// @ts-ignore
import ImageModule from 'docxtemplater-image-module-free';
import { renderAsync } from 'docx-preview';
import getImageOptions from './imageOptionHelper';
import flattenFullNameForms from './flattenNameConverting';

export async function generateReportPreview({
    template,
    userData,
    fullNameForms,
    previewRef,
}: {
    template: ArrayBuffer;
    userData: Record<string, any>;
    fullNameForms: Record<string, string>;
    previewRef: HTMLDivElement;
}) {
    const zip = new PizZip(template);
    const imageModule = new ImageModule(getImageOptions());

    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [imageModule],
        delimiters: { start: '{', end: '}' },
    });

    doc.setData({
        ...userData,
        ...flattenFullNameForms(fullNameForms),
    });

    doc.render();

    const buffer = doc.getZip().generate({ type: 'arraybuffer' });
    previewRef.innerHTML = 'Loading preview...';

    try {
        await renderAsync(buffer, previewRef);
        return buffer;
    } catch (err) {
        console.error('Preview render failed', err);
        previewRef.innerHTML = '❌ Failed to render preview';
        throw err;
    }
}
