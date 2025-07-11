import * as shevchenko from 'shevchenko';

export default async function generateFullNameForms(fullName: string): Promise<{
    // fn_nU
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
    fNU: string;
    gNc: string;
    pN: string;
    // Иванов И
    // nominative: string;
    // nominativeUpper: string;
    // genitive: string;
    // genitiveUpper: string;
    // dative: string;
    // dativeUpper: string;
    // accusative: string;
    // accusativeUpper: string;
    // locative: string;
    // locativeUpper: string;
    // vocative: string;
    // vocativeUpper: string;
    // familyNameUppercase: string;
    // givenNameUppercase: string;
    // patronymicName
}> {
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) throw new Error('Invalid fullName format');

    const [familyName, givenName, patronymicName = ''] = parts;

    const anthroponym = {
        familyName,
        givenName,
        patronymicName,
    };

    const gender = await shevchenko.detectGender(anthroponym);
    if (gender == null) {
        throw new Error('Failed to detect grammatical gender.');
    }

    const input = { ...anthroponym, gender };

    const join = (obj: typeof anthroponym) =>
        [obj.familyName, obj.givenName, obj.patronymicName].filter(Boolean).join(' ');

    const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

    const n = join(await shevchenko.inNominative(input));
    const g = join(await shevchenko.inGenitive(input));
    const d = join(await shevchenko.inDative(input));
    const a = join(await shevchenko.inAccusative(input));
    const l = join(await shevchenko.inLocative(input));
    const v = join(await shevchenko.inVocative(input));

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
        fNU: familyName.toUpperCase(),
        gNc: capitalize(givenName),
        pN: capitalize(patronymicName),
    };
}
