import { describe, expect, it } from 'vitest';

import type { AwardRecord } from '../types/user';
import {
    allAwards,
    AWARD_GROUPS,
    AWARDS,
    awardsSummary,
    awardTitle,
    compareAwards,
    customAwardDef,
    defaultAwardedBy,
    findAward,
    newAwardRecord,
    setCustomAwards,
} from './catalog';

const record = (awardId: string, extra: Partial<AwardRecord> = {}): AwardRecord => ({
    id: awardId,
    awardId,
    status: 'awarded',
    ...extra,
});

describe('the catalogue', () => {
    it('has unique ids, names and a known group for every award', () => {
        const ids = AWARDS.map((a) => a.id);
        expect(new Set(ids).size).toBe(ids.length);
        const names = AWARDS.map((a) => a.name);
        expect(new Set(names).size).toBe(names.length);
        const groups = new Set(AWARD_GROUPS.map((g) => g.id));
        expect(AWARDS.every((a) => groups.has(a.group))).toBe(true);
    });

    it('holds the state awards of the law and the military distinctions', () => {
        for (const name of [
            'Звання Герой України з врученням ордена «Золота Зірка»',
            'Орден «За мужність»',
            'Орден Богдана Хмельницького',
            'Медаль «За військову службу Україні»',
            'Хрест бойових заслуг',
            'Відзнака Президента України «За оборону України»',
            'Медаль «Залізний хрест»',
            'Медаль «Хрест Сухопутних військ»',
            'Почесний нагрудний знак «Золотий хрест»',
            'Почесний нагрудний знак «Хрест хоробрих»',
        ]) {
            expect(AWARDS.some((a) => a.name === name)).toBe(true);
        }
        expect(
            AWARDS.filter(
                (a) =>
                    a.group === 'mod' && !a.retired && a.kind !== 'letter' && a.kind !== 'weapon',
            ),
        ).toHaveLength(31);
        expect(findAward('order-yaroslav')?.degrees).toEqual(['I', 'II', 'III', 'IV', 'V']);
        expect(findAward('other')?.group).toBe('other');
    });
});

describe('records', () => {
    it('names an award with its degree, or as written for «Інша нагорода»', () => {
        expect(awardTitle(record('order-courage', { degree: 'III' }))).toBe(
            'Орден «За мужність» III ступеня',
        );
        expect(awardTitle(record('medal-defender', { degree: 'II' }))).toBe(
            'Медаль «Захиснику Вітчизни»',
        );
        expect(awardTitle(record('other', { title: 'Медаль «За доблесну службу» НГУ' }))).toBe(
            'Медаль «За доблесну службу» НГУ',
        );
    });

    it('starts a new record submitted, with the lowest degree and who awards it', () => {
        const fresh = newAwardRecord(findAward('order-merit')!);
        expect(fresh).toMatchObject({ awardId: 'order-merit', degree: 'III', status: 'submitted' });
        expect(fresh.awardedBy).toBe('Президент України');
        expect(fresh.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(defaultAwardedBy('mod-iron-cross')).toBe('Міністр оборони України');
    });

    it('lists granted awards for documents, most important first', () => {
        const records = [
            record('mod-iron-cross', { orderNumber: '12', orderDate: '01.02.2026' }),
            record('order-courage', { degree: 'III' }),
            record('cross-combat-merit', { status: 'submitted' }),
        ];
        expect([...records].sort(compareAwards).map((r) => r.awardId)).toEqual([
            'order-courage',
            'cross-combat-merit',
            'mod-iron-cross',
        ]);
        expect(awardsSummary(records)).toBe(
            'Орден «За мужність» III ступеня; Медаль «Залізний хрест» (№ 12 від 01.02.2026)',
        );
        expect(awardsSummary(records, false)).toContain('Хрест бойових заслуг');
        expect(awardsSummary(undefined)).toBe('');
    });
});

describe('own awards of the unit', () => {
    it('are found, named, sorted after the catalogue and offered «Від кого»', () => {
        setCustomAwards([
            customAwardDef({
                uuid: 'u-1',
                name: 'Нагрудний знак «За мужність» бригади',
                kind: 'badge',
                awardedBy: 'Командир бригади',
                degrees: ['I', 'II'],
                established: '',
                notes: '',
                retired: false,
            }),
        ]);
        try {
            const award = findAward('custom:u-1');
            expect(award?.group).toBe('unit');
            expect(awardTitle(record('custom:u-1', { degree: 'II' }))).toBe(
                'Нагрудний знак «За мужність» бригади II ступеня',
            );
            expect(defaultAwardedBy('custom:u-1')).toBe('Командир бригади');
            expect(defaultAwardedBy('sbu-valor')).toBe('Голова Служби безпеки України');
            const sorted = [record('custom:u-1'), record('order-courage')].sort(compareAwards);
            expect(sorted[0].awardId).toBe('order-courage');
            expect(allAwards().at(-1)?.id).toBe('other');
        } finally {
            setCustomAwards([]);
        }
    });
});
