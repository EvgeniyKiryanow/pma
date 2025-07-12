import {
    inNominative,
    inGenitive,
    inDative,
    inAccusative,
    inLocative,
    inVocative,
    type DeclensionInput,
    type DeclensionOutput,
    GrammaticalGender,
} from 'shevchenko';

export default async function generateFullNameForms(
    fullName: string,
    MASCULINE: GrammaticalGender,
): Promise<{
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
}> {
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) throw new Error('Invalid fullName format');

    const [familyName, givenName, patronymicName = ''] = parts;

    // TODO connect MASCULINE props
    const gender: GrammaticalGender = GrammaticalGender.MASCULINE;

    const input: DeclensionInput = {
        familyName,
        givenName,
        patronymicName,
        gender,
    };

    const join = (out: DeclensionOutput<DeclensionInput>) =>
        [out.familyName, out.givenName, out.patronymicName].filter(Boolean).join(' ');

    const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

    const nOut = await inNominative(input);
    const gOut = await inGenitive(input);
    const dOut = await inDative(input);
    const aOut = await inAccusative(input);
    const lOut = await inLocative(input);
    const vOut = await inVocative(input);

    const n = join(nOut);
    const g = join(gOut);
    const d = join(dOut);
    const a = join(aOut);
    const l = join(lOut);
    const v = join(vOut);

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
// import { GrammaticalGender } from 'shevchenko';

// const forms = await generateFullNameForms('Іванов Іван Іванович', GrammaticalGender.Male);

//
