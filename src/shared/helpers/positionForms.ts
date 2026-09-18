import type { MorphologyWordData } from './generateAndFlattenTitleForms';

/**
 * Cases of a position title. They are not derived by rules: the Excel import already carries
 * them ("повна посада називний/родовий/давальний/орудний"), so reports use the exact wording
 * the unit uses. Missing cases fall back to the closest available form.
 */
export function buildPositionForms(
    user: Record<string, any> | null | undefined,
): MorphologyWordData {
    const nominative = String(user?.positionNominative || user?.position || '').trim();
    if (!nominative) return {};

    const genitive = String(user?.positionGenitive || '').trim() || nominative;
    const dative = String(user?.positionDative || '').trim() || nominative;
    const instrumental = String(user?.positionInstrumental || '').trim() || nominative;

    return {
        word: nominative,
        nomn: nominative,
        gent: genitive,
        datv: dative,
        accs: genitive, // animate masculine: accusative matches genitive
        ablt: instrumental,
        loct: dative,
        voct: nominative,
    };
}

/**
 * Cases of the unit name. Unit names are free-form ("1 стрілецька рота", "в/ч А4784"), so they
 * are used as entered in "Додаткова інформація" — the app must not invent endings here.
 */
export function buildUnitForms(unitName: string | null | undefined): MorphologyWordData {
    const value = String(unitName ?? '').trim();
    if (!value) return {};
    return {
        word: value,
        nomn: value,
        gent: value,
        datv: value,
        accs: value,
        ablt: value,
        loct: value,
        voct: value,
    };
}
