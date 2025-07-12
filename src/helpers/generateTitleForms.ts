export type TitleForms = {
    n: string;
    nU: string;
    g: string;
    gU: string;
    d: string;
    dU: string;
    a: string;
    aU: string;
    l: string;
    lU: string;
    v: string;
    vU: string;
};

type MorphCase = 'nomn' | 'gent' | 'datv' | 'accs' | 'ablt' | 'loct' | 'voct';

export type MorphologyWordData = {
    word: string;
    cases: Partial<Record<MorphCase, string>>;
};

export default function generateTitleForms(
    rankData: MorphologyWordData,
    positionData: MorphologyWordData,
): TitleForms {
    const get = (caseCode: MorphCase): string => {
        const r = rankData?.cases?.[caseCode];
        const p = positionData?.cases?.[caseCode];
        return [r, p].filter(Boolean).join(' ');
    };

    const n = get('nomn');
    const g = get('gent');
    const d = get('datv');
    const a = get('accs');
    const l = get('loct');
    const v = get('voct');

    return {
        n,
        nU: n.toUpperCase(),
        g,
        gU: g.toUpperCase(),
        d,
        dU: d.toUpperCase(),
        a,
        aU: a.toUpperCase(),
        l,
        lU: l.toUpperCase(),
        v,
        vU: v.toUpperCase(),
    };
}
