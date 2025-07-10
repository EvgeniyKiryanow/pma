import * as shevchenko from 'shevchenko';

export default async function generateFullNameForms(fullName: string): Promise<{
    nominative: string;
    genitive: string;
    dative: string;
    accusative: string;
    locative: string;
    vocative: string;
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

    return {
        nominative: join(await shevchenko.inNominative(input)),
        genitive: join(await shevchenko.inGenitive(input)),
        dative: join(await shevchenko.inDative(input)),
        accusative: join(await shevchenko.inAccusative(input)),
        locative: join(await shevchenko.inLocative(input)),
        vocative: join(await shevchenko.inVocative(input)),
    };
}
