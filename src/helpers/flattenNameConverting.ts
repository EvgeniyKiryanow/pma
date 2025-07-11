export default function flattenFullNameForms(
    fullNameForms: Record<string, string>,
    shouldInclude = false,
) {
    const flat: Record<string, string> = {};

    for (const [key, value] of Object.entries(fullNameForms)) {
        flat[`fn_${key}`] = shouldInclude ? value : '';
    }

    return flat;
}
