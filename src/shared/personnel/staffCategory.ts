/**
 * Staff categories as the БЧС abbreviates them (column «кат»): «оф», «с-т», «солд»…
 * The card shows the full name with the abbreviation kept in brackets.
 */
const CATEGORIES: { name: string; codes: string[] }[] = [
    { name: 'Офіцерський склад', codes: ['оф', 'офіц', 'офіцер', 'о'] },
    { name: 'Сержантський і старшинський склад', codes: ['с-т', 'серж', 'сер', 'ст'] },
    { name: 'Рядовий склад', codes: ['солд', 'сол', 'с-д', 'ряд', 'р'] },
    { name: 'Працівник ЗСУ', codes: ['прац', 'пр', 'цп'] },
];

const normalize = (value: string) =>
    value.toLowerCase().replace(/[.\s]/g, '').replace(/[–—]/g, '-');

/** «оф» → «Офіцерський склад (оф)»; a value already written in full or unknown stays as is. */
export function staffCategoryName(value: unknown): string {
    const text = String(value ?? '').trim();
    if (!text) return '';
    const code = normalize(text);
    const found = CATEGORIES.find((category) => category.codes.includes(code));
    return found ? `${found.name} (${text})` : text;
}
