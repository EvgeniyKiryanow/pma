import { Building2, Camera, IdCard, Medal, UserPlus, UserRoundPen, Wand2 } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import {
    CARD,
    type CardCategoryId,
    type CardField,
    type CardSection,
    type CardSectionId,
} from '../../../../../shared/personnel/cardSchema';
import { RECOGNIZABLE_SECTIONS, recognizeSection } from '../../../../../shared/personnel/recognize';
import type { User } from '../../../../../shared/types/user';
import { reportError } from '../../../../shared/api/errors';
import { historyApi } from '../../../../shared/api/personnel';
import { useAsyncAction } from '../../../../shared/hooks/useAsyncAction';
import { personnelEvents } from '../../../../shared/lib/personnelEvents';
import { preparePhoto } from '../../../../shared/lib/photo';
import { pickFile } from '../../../../shared/lib/pickFiles';
import { Avatar, Button, cn, Count, Modal, Tabs } from '../../../../shared/ui';
import { confirmAction } from '../../../../shared/ui/confirm';
import { toast } from '../../../../shared/ui/toast';
import { StatusExcel } from '../../../../shared/utils/excelUserStatuses';
import { useI18nStore } from '../../../../stores/i18nStore';
import { useUserStore } from '../../../../stores/userStore';
import { useShtatniStore } from '../../../shtatna-posada/model/useShtatniStore';
import { cardHistoryEntries } from '../../model/cardHistory';
import { isFilled } from '../../model/cardValues';
import { removeFromPosition } from '../../model/personnelActions';
import AwardsEditor from './AwardsEditor';
import EducationEditor from './EducationEditor';
import { CardFieldInput, DictionarySelect } from './fields';
import RelativesEditor from './RelativesEditor';
import StaffPostEditor from './StaffPostEditor';

const EMPTY_FORM: Partial<User> = {
    fullName: '',
    fitnessCategory: 'Придатний',
    relatives: [],
    comments: [],
    history: [],
    educationList: [],
    awardRecords: [],
};

/** Pure dictionary spellings the «Розпізнати» button may put over what was typed. */
const NORMALIZED = new Set([
    'rank',
    'maritalStatus',
    'serviceType',
    'fitnessCategory',
    'bloodType',
    'taxId',
]);

const CATEGORY_ICONS: Record<CardCategoryId, ReactNode> = {
    personal: <IdCard />,
    awards: <Medal />,
    post: <Building2 />,
};

/** Fields filled / fields there are, in a section (lists count as one). */
function progressOf(section: CardSection, form: Partial<User>): [number, number] {
    const fields = section.fields.filter((f) => !f.legacy && f.kind !== 'checkbox');
    let filled = fields.filter((f) => isFilled(form[f.key])).length;
    let total = fields.length;
    const list =
        section.editor === 'education'
            ? form.educationList
            : section.editor === 'awards'
              ? form.awardRecords
              : section.editor === 'relatives'
                ? form.relatives
                : section.editor === 'staffPost'
                  ? form.shpkNumber
                      ? [1]
                      : []
                  : null;
    if (list) {
        total += 1;
        if (isFilled(list)) filled += 1;
    }
    return [filled, total];
}

/** The card of a service member: three categories, their sections, and the history of changes. */
export default function CardEditor({
    userToEdit,
    initialCategory = 'personal',
    onClose,
}: {
    userToEdit?: User | null;
    /** The category to open on (the card view's «Додати нагороду» opens «Нагороди»). */
    initialCategory?: CardCategoryId;
    onClose: () => void;
}) {
    const { t } = useI18nStore();
    const addUser = useUserStore((s) => s.addUser);
    const updateUser = useUserStore((s) => s.updateUser);
    const users = useUserStore((s) => s.users);
    const positions = useShtatniStore((s) => s.shtatniPosady);
    const isEditing = Boolean(userToEdit);

    const [form, setForm] = useState<Partial<User>>(() =>
        userToEdit ? { ...EMPTY_FORM, ...userToEdit } : { ...EMPTY_FORM },
    );
    const [category, setCategory] = useState<CardCategoryId>(initialCategory);
    const [activeSection, setActiveSection] = useState<CardSectionId>(
        () => CARD.find((c) => c.id === initialCategory)?.sections[0].id ?? 'identity',
    );
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!useShtatniStore.getState().shtatniPosady.length) {
            void useShtatniStore.getState().fetchAll();
        }
    }, []);

    const set = (patch: Partial<User>) => setForm((prev) => ({ ...prev, ...patch }));
    const sections = CARD.find((c) => c.id === category)?.sections ?? [];

    const switchCategory = (next: CardCategoryId) => {
        setCategory(next);
        setActiveSection(CARD.find((c) => c.id === next)!.sections[0].id);
        scrollRef.current?.scrollTo({ top: 0 });
    };

    const scrollTo = (id: CardSectionId) => {
        setActiveSection(id);
        const container = scrollRef.current;
        const target = container?.querySelector<HTMLElement>(`[data-section="${id}"]`);
        if (container && target) {
            container.scrollTo({ top: target.offsetTop - 12, behavior: 'smooth' });
        }
    };

    const onScroll = () => {
        const container = scrollRef.current;
        if (!container) return;
        const top = container.scrollTop + 40;
        let current = sections[0]?.id;
        container.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => {
            if (el.offsetTop <= top) current = (el.dataset.section as CardSectionId) ?? current;
        });
        if (current && current !== activeSection) setActiveSection(current);
    };

    const choosePhoto = async () => {
        try {
            const file = await pickFile('images');
            if (!file) return;
            set(await preparePhoto(file));
        } catch (err) {
            reportError(err, { context: 'photo-upload' });
        }
    };

    const recognize = (section: CardSection) => {
        const found = recognizeSection(form, section.id);
        const patch: Partial<Record<keyof User, string>> = {};
        for (const [key, value] of Object.entries(found) as [keyof User, string][]) {
            const current = String(form[key] ?? '').trim();
            if (!current || (NORMALIZED.has(key) && current !== value)) patch[key] = value;
        }
        const count = Object.keys(patch).length;
        if (!count) {
            toast.info(t('card.nothingRecognized'));
            return;
        }
        set(patch as unknown as Partial<User>);
        toast.success(t('card.recognized', { count }));
    };

    // The card closes only after the person is saved; on failure it stays open with the data.
    const save = useAsyncAction(
        async (finalUser: User) => {
            if (!isEditing) {
                await addUser(finalUser);
                return;
            }
            const before = userToEdit!;
            await updateUser(finalUser);
            const entries = cardHistoryEntries(before, finalUser, t);
            for (const entry of entries) await historyApi.add(finalUser.id, entry);
            if (entries.length) {
                useUserStore.setState((state) => ({ historyVersion: state.historyVersion + 1 }));
            }
            await personnelEvents.statusChanged({
                user: finalUser,
                from: before.soldierStatus ?? '',
                to: finalUser.soldierStatus ?? '',
            });
        },
        {
            success: isEditing ? 'Зміни збережено' : 'Військовослужбовця додано',
            onSuccess: onClose,
            context: 'user-form',
        },
    );

    const handleSubmit = async () => {
        const finalUser = {
            ...form,
            id: userToEdit?.id ?? Date.now(),
            relatives: form.relatives || [],
            comments: form.comments || [],
            history: form.history || [],
            educationList: form.educationList || [],
            awardRecords: form.awardRecords || [],
        } as User;

        // A staff position has one holder: taking a held one releases the holder first.
        const number = String(finalUser.shpkNumber ?? '').trim();
        const holder = number
            ? users.find((u) => u.id !== finalUser.id && String(u.shpkNumber ?? '') === number)
            : undefined;
        if (holder && String(userToEdit?.shpkNumber ?? '') !== number) {
            const confirmed = await confirmAction({
                title: t('card.staff.takeoverTitle'),
                message: t('card.staff.takeoverMessage', {
                    holder: holder.fullName,
                    number,
                    name: finalUser.fullName,
                }),
                confirmLabel: t('card.staff.takeoverConfirm'),
            });
            if (!confirmed) return;
            try {
                const position = positions.find((p) => String(p.shtat_number) === number);
                await removeFromPosition(holder, position);
            } catch (err) {
                reportError(err, { context: 'user-form.takeover' });
                return;
            }
        } else if (holder) {
            toast.error(
                `«${holder.fullName}» вже має номер по штату ${number}. Оберіть інший номер.`,
            );
            return;
        }

        void save.run(finalUser);
    };

    const counts: Record<CardCategoryId, number> = useMemo(
        () => ({
            personal: 0,
            awards: form.awardRecords?.length ?? 0,
            post: 0,
        }),
        [form.awardRecords],
    );

    const renderFields = (fields: CardField[]) =>
        fields
            // Name and status are edited in the header strip.
            .filter((field) => !field.legacy && field.key !== 'soldierStatus')
            .filter((field) => field.key !== 'fullName')
            .filter((field) => field.key !== 'criminalRecordDetails' || form.hasCriminalRecord)
            .filter((field) => field.key !== 'attachedFrom' || form.isAttached)
            .map((field) => (
                <CardFieldInput
                    key={field.key}
                    field={field}
                    value={form[field.key] as string | boolean | undefined}
                    onChange={(value) => set({ [field.key]: value } as Partial<User>)}
                />
            ));

    const legacyBlock = (section: CardSection) => {
        const legacy = section.fields.filter((f) => f.legacy);
        if (!legacy.some((f) => isFilled(form[f.key]))) return null;
        return (
            <div className="col-span-full space-y-3 rounded-xl border border-line bg-surface-2 p-3">
                <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-55 flex-1">
                        <p className="text-[13px] font-semibold text-ink">
                            {t('card.legacyTitle')}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-3">{t('card.legacyHint')}</p>
                    </div>
                    {RECOGNIZABLE_SECTIONS.has(section.id) && (
                        <Button
                            variant="soft"
                            size="sm"
                            icon={<Wand2 className="size-3.5" />}
                            onClick={() => recognize(section)}
                        >
                            {t('card.recognize')}
                        </Button>
                    )}
                </div>
                <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2">
                    {legacy.map((field) => (
                        <CardFieldInput
                            key={field.key}
                            field={field}
                            value={form[field.key] as string | undefined}
                            onChange={(value) => set({ [field.key]: value } as Partial<User>)}
                        />
                    ))}
                </div>
            </div>
        );
    };

    const sectionBody = (section: CardSection) => {
        switch (section.editor) {
            case 'awards':
                return (
                    <>
                        <div className="col-span-full">
                            <AwardsEditor
                                userId={userToEdit?.id}
                                records={form.awardRecords ?? []}
                                onChange={(awardRecords) => set({ awardRecords })}
                            />
                        </div>
                        {legacyBlock(section)}
                    </>
                );
            case 'education':
                return (
                    <>
                        <div className="col-span-full">
                            <EducationEditor
                                entries={form.educationList ?? []}
                                onChange={(educationList) => set({ educationList })}
                            />
                        </div>
                        {renderFields(section.fields)}
                        {legacyBlock(section)}
                    </>
                );
            case 'relatives':
                return (
                    <>
                        <div className="col-span-full">
                            <RelativesEditor
                                relatives={form.relatives ?? []}
                                onChange={(relatives) => set({ relatives })}
                            />
                        </div>
                        {renderFields(section.fields)}
                    </>
                );
            case 'staffPost':
                return (
                    <>
                        <div className="col-span-full">
                            <StaffPostEditor
                                userId={userToEdit?.id}
                                form={form}
                                onChange={set}
                                positions={positions}
                                users={users}
                            />
                        </div>
                        {renderFields(section.fields)}
                    </>
                );
            default:
                return (
                    <>
                        {renderFields(section.fields)}
                        {legacyBlock(section)}
                    </>
                );
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={isEditing ? t('user.editUser') : t('user.addUser')}
            description={
                isEditing ? form.fullName : 'Заповніть основні дані — решту можна додати пізніше'
            }
            icon={isEditing ? <UserRoundPen /> : <UserPlus />}
            width="max-w-6xl"
            closeOnBackdrop={false}
            bodyClassName="p-0 flex min-h-0 flex-col"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={save.pending}>
                        {t('user.cancel')}
                    </Button>
                    <Button
                        onClick={() => void handleSubmit()}
                        loading={save.pending}
                        disabled={!String(form.fullName || '').trim()}
                    >
                        {isEditing ? t('user.save') : t('user.add')}
                    </Button>
                </>
            }
        >
            {/* Photo, name, status: always in sight */}
            <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-line bg-surface-2 px-5 py-3">
                <button
                    type="button"
                    onClick={() => void choosePhoto()}
                    aria-label={t('user.photo')}
                    className="group relative cursor-pointer rounded-2xl"
                >
                    {form.photo ? (
                        <img
                            src={form.photo}
                            alt=""
                            className="size-16 rounded-2xl object-cover shadow-card"
                        />
                    ) : (
                        <Avatar name={form.fullName || '?'} size={64} rounded="rounded-2xl" />
                    )}
                    <span className="absolute inset-0 grid place-items-center rounded-2xl bg-[oklch(15%_0.02_130/0.55)] text-[oklch(98%_0_0)] opacity-0 transition-opacity group-hover:opacity-100">
                        <Camera className="size-5" />
                    </span>
                </button>
                <div className="min-w-55 flex-1">
                    <label htmlFor="card-full-name" className="label">
                        {t('card.fields.fullName')}
                    </label>
                    <input
                        id="card-full-name"
                        className="field text-[15px] font-semibold"
                        value={form.fullName ?? ''}
                        onChange={(e) => set({ fullName: e.target.value })}
                        autoFocus={!isEditing}
                    />
                </div>
                <div className="w-full max-w-xs">
                    <label htmlFor="card-status" className="label">
                        {t('card.fields.soldierStatus')}
                    </label>
                    <DictionarySelect
                        id="card-status"
                        value={form.soldierStatus ?? ''}
                        options={Object.values(StatusExcel)}
                        onChange={(soldierStatus) => set({ soldierStatus })}
                    />
                </div>
            </div>

            <Tabs
                value={category}
                onChange={switchCategory}
                className="shrink-0 border-b border-line px-3"
                items={CARD.map((c) => ({
                    value: c.id,
                    label: t(`card.categories.${c.id}`),
                    icon: CATEGORY_ICONS[c.id],
                    count: c.id === 'awards' ? counts.awards : undefined,
                }))}
            />

            <div className="flex min-h-0 flex-1">
                {sections.length > 1 && (
                    <nav className="hidden w-60 shrink-0 overflow-y-auto border-r border-line bg-surface-2 p-3 lg:block">
                        <p className="mb-2 px-3 text-[11px] leading-snug text-ink-3">
                            {t(`card.categoryHints.${category}`)}
                        </p>
                        <ul className="space-y-0.5">
                            {sections.map((section) => {
                                const [filled, total] = progressOf(section, form);
                                return (
                                    <li key={section.id}>
                                        <button
                                            type="button"
                                            onClick={() => scrollTo(section.id)}
                                            className={cn(
                                                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                                                activeSection === section.id
                                                    ? 'bg-surface font-medium text-ink shadow-card'
                                                    : 'text-ink-3 hover:bg-surface hover:text-ink',
                                            )}
                                        >
                                            <span className="min-w-0 flex-1 truncate">
                                                {t(`card.sections.${section.id}`)}
                                            </span>
                                            {filled > 0 && (
                                                <Count
                                                    value={filled}
                                                    tone={filled === total ? 'brass' : 'gray'}
                                                />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>
                )}

                <div
                    ref={scrollRef}
                    onScroll={onScroll}
                    className="@container relative min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-5"
                >
                    {category === 'awards' && (
                        <p className="-mb-3 text-[13px] text-ink-3">
                            {t('card.categoryHints.awards')}
                        </p>
                    )}
                    {sections.map((section) => (
                        <section key={section.id} data-section={section.id} className="scroll-mt-4">
                            {sections.length > 1 && (
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                                    <span className="h-4 w-1 rounded-full bg-primary" />
                                    {t(`card.sections.${section.id}`)}
                                </h3>
                            )}
                            <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @3xl:grid-cols-3">
                                {sectionBody(section)}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </Modal>
    );
}
