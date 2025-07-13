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

export default async function generateAndFlattenFullNameForms(
    fullName: string,
    gender: GrammaticalGender,
    shouldInclude = false,
    prefix = 'fn',
): Promise<Record<string, string>> {
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) throw new Error('Invalid fullName format');

    const [familyName, givenName, patronymicName = ''] = parts;

    type MixDeclensionFn = (word: string, gender: GrammaticalGender) => Promise<string>;
    const input: DeclensionInput = {
        familyName,
        givenName,
        patronymicName,
        gender,
    };

    const join = (out: DeclensionOutput<DeclensionInput>) =>
        [out.familyName, out.givenName, out.patronymicName].filter(Boolean).join(' ');

    const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

    const n = join(await inNominative(input));
    const g = join(await inGenitive(input));
    const d = join(await inDative(input));
    const a = join(await inAccusative(input));
    const l = join(await inLocative(input));
    const v = join(await inVocative(input));

    const result: Record<string, string> = {
        [`${prefix}_n`]: shouldInclude ? n : '',
        [`${prefix}_nU`]: shouldInclude ? n.toUpperCase() : '',
        [`${prefix}_g`]: shouldInclude ? g : '',
        [`${prefix}_gU`]: shouldInclude ? g.toUpperCase() : '',
        [`${prefix}_d`]: shouldInclude ? d : '',
        [`${prefix}_dU`]: shouldInclude ? d.toUpperCase() : '',
        [`${prefix}_a`]: shouldInclude ? a : '',
        [`${prefix}_aU`]: shouldInclude ? a.toUpperCase() : '',
        [`${prefix}_l`]: shouldInclude ? l : '',
        [`${prefix}_lU`]: shouldInclude ? l.toUpperCase() : '',
        [`${prefix}_v`]: shouldInclude ? v : '',
        [`${prefix}_vU`]: shouldInclude ? v.toUpperCase() : '',
        [`${prefix}_fNU`]: shouldInclude ? familyName.toUpperCase() : '',
        [`${prefix}_gNc`]: shouldInclude ? capitalize(givenName) : '',
        [`${prefix}_pN`]: shouldInclude ? capitalize(patronymicName) : '',
        [`${prefix}_afU`]: shouldInclude
            ? (await inAccusative({ familyName: familyName.toUpperCase(), gender })).familyName +
              ' ' +
              (await inAccusative({ givenName: capitalize(givenName), gender })).givenName +
              ' ' +
              (await inAccusative({ patronymicName: capitalize(patronymicName), gender }))
                  .patronymicName
            : '',
    };

    return result;
}
