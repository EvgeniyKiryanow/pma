type MorphCase = 'nomn' | 'gent' | 'datv' | 'accs' | 'ablt' | 'loct' | 'voct';

export type MorphologyWordData = {
    word: string;
    cases: Partial<Record<MorphCase, string>>;
};

export default function generateAndFlattenTitleForms(
    rankData: MorphologyWordData,
    positionData: MorphologyWordData,
    shouldInclude = false,
    prefix = '',
): Record<string, string> {
    const get = (caseCode: MorphCase): string => {
        const r = rankData?.cases?.[caseCode];
        const p = positionData?.cases?.[caseCode];
        return [r, p].filter(Boolean).join(' ');
    };

    const flat: Record<string, string> = {};

    const mapping: Record<string, string> = {
        n: get('nomn'),
        g: get('gent'),
        d: get('datv'),
        a: get('accs'),
        l: get('loct'),
        v: get('voct'),
    };

    for (const [key, value] of Object.entries(mapping)) {
        const val = value ?? '';
        flat[`${prefix}_${key}`] = shouldInclude ? val : '';
        flat[`${prefix}_${key}U`] = shouldInclude ? val.toUpperCase() : '';
    }

    return flat;
}
