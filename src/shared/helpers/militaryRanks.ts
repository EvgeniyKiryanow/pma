import type { MorphologyWordData } from './generateAndFlattenTitleForms';

/**
 * Declension of Ukrainian military ranks.
 *
 * Ranks are a closed list, so a small rule set replaces the Python morphology service that
 * used to do this (and was removed). Unknown words are returned unchanged in every case,
 * so a report never shows a mangled rank.
 */

type Forms = Required<
    Pick<MorphologyWordData, 'nomn' | 'gent' | 'datv' | 'accs' | 'ablt' | 'loct' | 'voct'>
>;

const ADJECTIVES: Record<string, Forms> = {
    молодший: adjective('молодш'),
    старший: adjective('старш'),
    головний: adjective('головн'),
    бригадний: adjective('бригадн'),
};

/** Hard-stem masculine adjectives: молодший → молодшого, молодшому, молодшим... */
function adjective(stem: string): Forms {
    const soft = stem.endsWith('ш') || stem.endsWith('ч') || stem.endsWith('ж');
    const ending = soft ? 'ий' : 'ий';
    return {
        nomn: `${stem}${ending}`,
        gent: `${stem}ого`,
        datv: `${stem}ому`,
        accs: `${stem}ого`,
        ablt: `${stem}им`,
        loct: `${stem}ому`,
        voct: `${stem}${ending}`,
    };
}

/** Masculine animate nouns ending in a consonant: сержант → сержанта, сержанту... */
function masculineNoun(word: string): Forms {
    const vocative = /[кгх]$/.test(word) ? `${word}у` : `${word}е`;
    return {
        nomn: word,
        gent: `${word}а`,
        datv: `${word}у`,
        accs: `${word}а`,
        ablt: `${word}ом`,
        loct: `${word}ові`,
        voct: vocative,
    };
}

/** Nouns in -а (старшина) follow the feminine pattern even though the person is male. */
function nounInA(word: string): Forms {
    const stem = word.slice(0, -1);
    return {
        nomn: word,
        gent: `${stem}и`,
        datv: `${stem}і`,
        accs: `${stem}у`,
        ablt: `${stem}ою`,
        loct: `${stem}і`,
        voct: `${stem}о`,
    };
}

const NOUN_EXCEPTIONS: Record<string, Forms> = {
    старшина: nounInA('старшина'),
    матрос: masculineNoun('матрос'),
};

const KNOWN_NOUNS = new Set([
    'солдат',
    'матрос',
    'сержант',
    'старшина',
    'прапорщик',
    'лейтенант',
    'капітан',
    'майор',
    'підполковник',
    'полковник',
    'генерал',
    'майор',
]);

function declineWord(word: string): Forms | null {
    const lower = word.toLowerCase();
    if (ADJECTIVES[lower]) return ADJECTIVES[lower];
    if (NOUN_EXCEPTIONS[lower]) return NOUN_EXCEPTIONS[lower];

    // Compound ranks (штаб-сержант, майстер-сержант, генерал-майор): decline the last part.
    if (lower.includes('-')) {
        const parts = lower.split('-');
        const last = declineWord(parts.pop() as string);
        if (!last) return null;
        const prefix = `${parts.join('-')}-`;
        return Object.fromEntries(
            Object.entries(last).map(([key, value]) => [key, `${prefix}${value}`]),
        ) as Forms;
    }

    if (lower.endsWith('а')) return nounInA(lower);
    if (KNOWN_NOUNS.has(lower) || /(ник|ант|ент|ор|ир|ал|ік|ик)$/.test(lower)) {
        return masculineNoun(lower);
    }
    return null;
}

const CASES: (keyof Forms)[] = ['nomn', 'gent', 'datv', 'accs', 'ablt', 'loct', 'voct'];

/** "старший сержант" → all cases; unknown input is returned unchanged. */
export function declineRank(rank: string | null | undefined): MorphologyWordData {
    const source = String(rank ?? '').trim();
    if (!source) return {};

    const words = source.split(/\s+/);
    const declined = words.map(declineWord);
    if (declined.some((forms) => forms === null)) {
        return CASES.reduce<MorphologyWordData>(
            (acc, grammaticalCase) => ({ ...acc, [grammaticalCase]: source }),
            { word: source },
        );
    }

    return CASES.reduce<MorphologyWordData>(
        (acc, grammaticalCase) => ({
            ...acc,
            [grammaticalCase]: (declined as Forms[])
                .map((forms) => forms[grammaticalCase])
                .join(' '),
        }),
        { word: source },
    );
}
