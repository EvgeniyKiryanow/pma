export default function flattenFullNameForms(fullNameForms: Record<string, string>) {
    const flat: Record<string, string> = {};
    for (const [key, value] of Object.entries(fullNameForms)) {
        flat[`fn_${key}`] = value;
    }
    return flat;
}
