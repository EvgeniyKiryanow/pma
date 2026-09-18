import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ BrowserWindow: class {} }));

import { documentHtml } from './DocumentPrinter';

const doc = {
    title: 'Звіт <b>',
    html: '<table><tr><td>1</td></tr></table>',
    css: 'td { color: red; }',
    landscape: true,
    scale: 0.8,
};

describe('documentHtml', () => {
    it('forbids scripts and network through the content security policy', () => {
        expect(documentHtml(doc)).toContain(
            `content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:"`,
        );
    });

    it('escapes the title and keeps the report as it is', () => {
        const html = documentHtml(doc);
        expect(html).toContain('<title>Звіт &lt;b&gt;</title>');
        expect(html).not.toContain('Звіт <b>');
        expect(html).toContain(doc.html);
    });

    it('does not let a style sheet close its own element', () => {
        const html = documentHtml({ ...doc, css: 'a{}</style><script>x()</script>' });
        expect(html).not.toContain('</style><script>');
    });

    it('sets the page orientation', () => {
        expect(documentHtml(doc)).toContain('size: A4 landscape');
        expect(documentHtml({ ...doc, landscape: false })).toContain('size: A4 portrait');
    });
});
