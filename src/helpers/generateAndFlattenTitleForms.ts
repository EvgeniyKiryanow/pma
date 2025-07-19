type MorphCase = 'nomn' | 'gent' | 'datv' | 'accs' | 'ablt' | 'loct' | 'voct';

export type MorphologyWordData = Partial<Record<MorphCase, string>> & {
    word?: string;
};

type MorphologyResponse = {
    word: string;
    cases: Record<string, string>;
};

export function extractCasesFromResponse(
    response: MorphologyResponse[],
    requiredCases: MorphCase[] = ['nomn', 'datv', 'gent', 'accs', 'ablt', 'loct', 'voct'],
): Record<string, string> {
    const result: Record<string, string> = {};

    for (const caseKey of requiredCases) {
        result[caseKey] = response
            .map((wordInfo) => wordInfo.cases[caseKey] || wordInfo.word)
            .join(' ');
    }

    return result;
}

export default function generateAndFlattenTitleForms(
    rankData: MorphologyWordData,
    positionData: MorphologyWordData,
    unitName: MorphologyWordData,
    shouldInclude = false,
    prefix = '',
): Record<string, string> {
    const get = (caseCode: MorphCase): string => {
        const r = rankData?.[caseCode];
        const p = positionData?.[caseCode];
        const u = unitName?.[caseCode];
        return [r, p, u].filter(Boolean).join(' ');
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
    alert(`Title forms generated: ${JSON.stringify(mapping)}`);
    for (const [key, value] of Object.entries(mapping)) {
        const val = value ?? '';
        flat[`${prefix}_${key}`] = shouldInclude ? val : '';
        flat[`${prefix}_${key}U`] = shouldInclude ? val.toUpperCase() : '';
    }

    return flat;
}
