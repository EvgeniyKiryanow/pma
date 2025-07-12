import type { TitleForms } from './generateTitleForms';

export default function flattenTitleForms(
    titleForms: Partial<TitleForms> = {},
    shouldInclude = false,
    prefix = '',
): Record<string, string> {
    const flat: Record<string, string> = {};

    const caseKeys = ['n', 'nU', 'g', 'gU', 'd', 'dU', 'a', 'aU', 'l', 'lU', 'v', 'vU'] as const;

    for (const key of caseKeys) {
        const val = titleForms[key] ?? '';
        flat[`${prefix}_${key}`] = shouldInclude ? val : '';
    }

    return flat;
}
