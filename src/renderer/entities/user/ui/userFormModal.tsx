import { Camera, Plus, Trash2, UserPlus, UserRoundPen } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import type { RelativeContact, User } from '../../../../shared/types/user';
import { reportError } from '../../../shared/api/errors';
import { useAsyncAction } from '../../../shared/hooks/useAsyncAction';
import { pickFile, readAsDataUrl } from '../../../shared/lib/pickFiles';
import { Avatar, Button, cn, IconButton, Modal } from '../../../shared/ui';
import { toast } from '../../../shared/ui/toast';
import { StatusExcel } from '../../../shared/utils/excelUserStatuses';
import { useI18nStore } from '../../../stores/i18nStore';
import { useUserStore } from '../../../stores/userStore';

const EMPTY_FORM: Partial<User> = {
    fullName: '',
    dateOfBirth: '',
    position: '',
    rank: '',
    rights: '',
    conscriptionInfo: '',
    notes: '',
    email: '',
    phoneNumber: '',
    education: '',
    awards: '',
    photo: '',
    relatives: [],
    comments: [],
    history: [],
    callsign: '',
    passportData: '',
    participantNumber: '',
    identificationNumber: '',
    fitnessCategory: 'Придатний',
    unitNumber: '',
    hasCriminalRecord: false,
    criminalRecordDetails: '',
    militaryTicketInfo: '',
    militaryServiceHistory: '',
    civilProfession: '',
    educationDetails: '',
    residenceAddress: '',
    registeredAddress: '',
    healthConditions: '',
    maritalStatus: '',
    familyInfo: '',
    religion: '',
    recruitingOffice: '',
    driverLicenses: '',
    bloodType: '',

    // hierarchy
    unitMain: '',
    unitLevel1: '',
    unitLevel2: '',
    platoon: '',
    squad: '',
    subordination: '',

    // military specialization
    vosCode: '',
    shpkCode: '',
    shpkNumber: '',
    category: '',
    kshp: '',

    // rank / appointment
    rankAssignedBy: '',
    rankAssignmentDate: '',
    appointmentOrder: '',
    previousStatus: '',

    // personal details
    placeOfBirth: '',
    taxId: '',
    serviceType: '',
    recruitmentOfficeDetails: '',
    ubdStatus: '',
    childrenInfo: '',

    // absence / status
    bzvpStatus: '',
    rvbzPresence: '',
    absenceReason: '',
    absenceFromDate: '',
    absenceToDate: '',

    // Excel specific
    personalPrisonFileExists: '',
    tDotData: '',
    positionNominative: '',
    positionGenitive: '',
    positionDative: '',
    positionInstrumental: '',
    soldierStatus: '',
};

type SectionDef = { id: string; title: string };

export default function UserFormModalUpdate({
    userToEdit,
    onClose,
}: {
    userToEdit?: User | null;
    onClose: () => void;
}) {
    const addUser = useUserStore((s) => s.addUser);
    const updateUser = useUserStore((s) => s.updateUser);
    const { t } = useI18nStore();
    const isEditing = !!userToEdit;
    const scrollRef = useRef<HTMLDivElement>(null);

    const [form, setForm] = useState<Partial<User>>(EMPTY_FORM);
    const [photoPreview, setPhotoPreview] = useState<string>('');
    const [activeSection, setActiveSection] = useState('basic');

    useEffect(() => {
        if (userToEdit) {
            setForm(userToEdit);
            setPhotoPreview(userToEdit.photo || '');
        } else {
            setForm({ ...EMPTY_FORM, fitnessCategory: 'Придатний' });
            setPhotoPreview('');
        }
    }, [userToEdit]);

    const choosePhoto = async () => {
        try {
            const file = await pickFile('images');
            if (!file) return;
            const photo = await readAsDataUrl(file);
            setForm((f) => ({ ...f, photo }));
            setPhotoPreview(photo);
        } catch (err) {
            reportError(err, { context: 'photo-upload' });
        }
    };

    const handleAddRelative = () => {
        setForm((prev) => ({
            ...prev,
            relatives: [...(prev.relatives || []), { name: '', relationship: '' }],
        }));
    };

    const handleRemoveRelative = (index: number) => {
        setForm((prev) => ({
            ...prev,
            relatives: (prev.relatives || []).filter((_, i) => i !== index),
        }));
    };

    const handleRelativeChange = (index: number, field: keyof RelativeContact, value: string) => {
        const updated = [...(form.relatives || [])];
        updated[index] = { ...updated[index], [field]: value };
        setForm((prev) => ({ ...prev, relatives: updated }));
    };

    const handleChange = <K extends keyof User>(key: K, value: User[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };
    const allUsers = useUserStore((s) => s.users);
    // The form closes only after the person is saved; on failure it stays open with the data.
    const save = useAsyncAction((user: User) => (isEditing ? updateUser(user) : addUser(user)), {
        success: isEditing ? 'Зміни збережено' : 'Військовослужбовця додано',
        onSuccess: onClose,
        context: 'user-form',
    });

    const handleSubmit = () => {
        const finalUser: User = {
            id: userToEdit?.id ?? Date.now(),
            ...form,
            relatives: form.relatives || [],
            comments: form.comments || [],
            history: form.history || [],
        } as User;

        const duplicate = allUsers.find(
            (u) => u.shpkNumber && u.shpkNumber === finalUser.shpkNumber && u.id !== finalUser.id, // allow if editing same user
        );

        if (duplicate) {
            toast.error(
                `«${duplicate.fullName}» вже має номер по штату ${finalUser.shpkNumber}. Оберіть інший номер.`,
            );
            return;
        }

        void save.run(finalUser);
    };

    const sections: SectionDef[] = [
        { id: 'basic', title: t('sections.basic') },
        { id: 'personal', title: t('sections.personalDetails') },
        { id: 'positionCases', title: t('sections.positionCases') },
        { id: 'military', title: t('sections.military') },
        { id: 'rank', title: t('sections.rankAndAppointment') },
        { id: 'hierarchy', title: t('sections.hierarchy') },
        { id: 'absence', title: t('sections.absenceStatus') },
        { id: 'specialization', title: t('sections.militarySpecialization') },
        { id: 'legal', title: t('sections.legal') },
        { id: 'health', title: t('sections.health') },
        { id: 'background', title: t('sections.background') },
        { id: 'relatives', title: t('user.relatives') },
    ];

    const scrollTo = (id: string) => {
        setActiveSection(id);
        const container = scrollRef.current;
        const target = container?.querySelector<HTMLElement>(`[data-section="${id}"]`);
        if (container && target) {
            container.scrollTo({ top: target.offsetTop - 12, behavior: 'smooth' });
        }
    };

    // Highlight the section being read while scrolling.
    const onScroll = () => {
        const container = scrollRef.current;
        if (!container) return;
        const top = container.scrollTop + 40;
        let current = sections[0].id;
        container.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => {
            if (el.offsetTop <= top) current = el.dataset.section ?? current;
        });
        if (current !== activeSection) setActiveSection(current);
    };

    const renderField = (key: keyof User, isTextarea = false) => {
        const id = `user-field-${String(key)}`;
        if (key === 'hasCriminalRecord') {
            return (
                <label
                    key={key}
                    className="flex items-center gap-2.5 self-end rounded-lg border border-line px-3 py-2.5 text-sm text-ink"
                >
                    <input
                        type="checkbox"
                        className="size-4"
                        checked={!!form.hasCriminalRecord}
                        onChange={(e) => handleChange('hasCriminalRecord', e.target.checked)}
                    />
                    {t(`user.${key}`)}
                </label>
            );
        }

        if (key === 'criminalRecordDetails' && !form.hasCriminalRecord) return null;

        if (key === 'fitnessCategory') {
            return (
                <div key={key}>
                    <label htmlFor={id} className="label">
                        {t(`user.${key}`)}
                    </label>
                    <select
                        id={id}
                        className="field"
                        value={form.fitnessCategory || ''}
                        onChange={(e) => handleChange('fitnessCategory', e.target.value)}
                    >
                        <option value="Придатний">{t('user.fitnessCategoryOption.fit')}</option>
                        <option value="Обмежено придатний">
                            {t('user.fitnessCategoryOption.limited')}
                        </option>
                    </select>
                </div>
            );
        }

        return (
            <div key={key} className={cn(isTextarea && '@2xl:col-span-2')}>
                <label htmlFor={id} className="label">
                    {t(`user.${key}`)}
                </label>
                {isTextarea ? (
                    <textarea
                        id={id}
                        className="field"
                        rows={2}
                        value={String(form[key] || '')}
                        onChange={(e) => handleChange(key, e.target.value)}
                    />
                ) : (
                    <input
                        id={id}
                        className="field"
                        value={String(form[key] || '')}
                        onChange={(e) => handleChange(key, e.target.value)}
                    />
                )}
            </div>
        );
    };

    // A plain function, not a component: a component declared here would remount its inputs
    // on every keystroke and drop the focus.
    const section = (id: string, children: ReactNode) => (
        <section data-section={id} className="scroll-mt-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="h-4 w-1 rounded-full bg-primary" />
                {sections.find((s) => s.id === id)?.title}
            </h3>
            <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @3xl:grid-cols-3">
                {children}
            </div>
        </section>
    );

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
            bodyClassName="p-0 flex min-h-0"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={save.pending}>
                        {t('user.cancel')}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        loading={save.pending}
                        disabled={!String(form.fullName || '').trim()}
                    >
                        {isEditing ? t('user.save') : t('user.add')}
                    </Button>
                </>
            }
        >
            <nav className="hidden w-56 shrink-0 overflow-y-auto border-r border-line bg-surface-2 p-3 lg:block">
                <ul className="space-y-0.5">
                    {sections.map((section) => (
                        <li key={section.id}>
                            <button
                                onClick={() => scrollTo(section.id)}
                                className={cn(
                                    'w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                                    activeSection === section.id
                                        ? 'bg-surface font-medium text-ink shadow-card'
                                        : 'text-ink-3 hover:bg-surface hover:text-ink',
                                )}
                            >
                                {section.title}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            <div
                ref={scrollRef}
                onScroll={onScroll}
                className="@container relative min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-5"
            >
                {/* Photo + status */}
                <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-line bg-surface-2 p-4">
                    <button
                        type="button"
                        onClick={() => void choosePhoto()}
                        aria-label={t('user.photo')}
                        className="group relative cursor-pointer rounded-2xl"
                    >
                        {photoPreview ? (
                            <img
                                src={photoPreview}
                                alt=""
                                className="size-24 rounded-2xl object-cover shadow-card"
                            />
                        ) : (
                            <Avatar name={form.fullName || '?'} size={96} rounded="rounded-2xl" />
                        )}
                        <span className="absolute inset-0 grid place-items-center rounded-2xl bg-[oklch(15%_0.02_130/0.55)] text-[oklch(98%_0_0)] opacity-0 transition-opacity group-hover:opacity-100">
                            <Camera className="size-6" />
                        </span>
                    </button>
                    <div className="min-w-[220px] flex-1 space-y-3">
                        <div>
                            <p className="text-sm font-medium text-ink">{t('user.photo')}</p>
                            <p className="text-xs text-ink-3">
                                Натисніть на фото, щоб {photoPreview ? 'замінити' : 'завантажити'}{' '}
                                (JPG / PNG)
                            </p>
                        </div>
                        <div className="max-w-md">
                            <label htmlFor="user-field-status" className="label">
                                {t('user.soldierStatus')}
                            </label>
                            <select
                                id="user-field-status"
                                className="field"
                                value={form.soldierStatus || ''}
                                onChange={(e) => handleChange('soldierStatus', e.target.value)}
                            >
                                <option value="">— Оберіть статус —</option>
                                {Object.values(StatusExcel).map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {section(
                    'basic',
                    <>
                        {renderField('fullName')}
                        {renderField('callsign')}
                        {renderField('dateOfBirth')}
                        {renderField('email')}
                        {renderField('phoneNumber')}
                        {renderField('notes', true)}
                    </>,
                )}

                {section(
                    'personal',
                    <>
                        {renderField('placeOfBirth')}
                        {renderField('gender')}
                        {renderField('maritalStatus')}
                        {renderField('childrenInfo')}
                        {renderField('religion')}
                        {renderField('familyInfo', true)}
                    </>,
                )}

                {section(
                    'positionCases',
                    <>
                        {renderField('position')}
                        {renderField('positionNominative')}
                        {renderField('positionGenitive')}
                        {renderField('positionDative')}
                        {renderField('positionInstrumental')}
                        {renderField('tDotData')}
                        {renderField('personalPrisonFileExists')}
                    </>,
                )}

                {section(
                    'military',
                    <>
                        {renderField('rights')}
                        {renderField('recruitingOffice')}
                        {renderField('ubdStatus')}
                        {renderField('militaryTicketInfo', true)}
                        {renderField('militaryServiceHistory', true)}
                        {renderField('conscriptionInfo', true)}
                    </>,
                )}

                {section(
                    'rank',
                    <>
                        {renderField('rank')}
                        {renderField('rankAssignedBy')}
                        {renderField('rankAssignmentDate')}
                        {renderField('appointmentOrder')}
                        {renderField('previousStatus')}
                    </>,
                )}

                {section(
                    'hierarchy',
                    <>
                        {renderField('unitMain')}
                        {renderField('unitLevel1')}
                        {renderField('unitLevel2')}
                        {renderField('platoon')}
                        {renderField('squad')}
                        {renderField('subordination')}
                        {renderField('unitNumber')}
                    </>,
                )}

                {section(
                    'absence',
                    <>
                        {renderField('bzvpStatus')}
                        {renderField('rvbzPresence')}
                        {renderField('absenceReason')}
                        {renderField('absenceFromDate')}
                        {renderField('absenceToDate')}
                    </>,
                )}

                {section(
                    'specialization',
                    <>
                        {renderField('vosCode')}
                        {renderField('shpkCode')}
                        {renderField('shpkNumber')}
                        {renderField('category')}
                        {renderField('kshp')}
                    </>,
                )}

                {section(
                    'legal',
                    <>
                        {renderField('passportData')}
                        {renderField('identificationNumber')}
                        {renderField('participantNumber')}
                        {renderField('taxId')}
                        {renderField('hasCriminalRecord')}
                        {renderField('criminalRecordDetails', true)}
                    </>,
                )}

                {section(
                    'health',
                    <>
                        {renderField('fitnessCategory')}
                        {renderField('bloodType')}
                        {renderField('healthConditions', true)}
                    </>,
                )}

                {section(
                    'background',
                    <>
                        {renderField('civilProfession')}
                        {renderField('education')}
                        {renderField('awards')}
                        {renderField('driverLicenses')}
                        {renderField('residenceAddress')}
                        {renderField('registeredAddress')}
                        {renderField('educationDetails', true)}
                    </>,
                )}

                <section data-section="relatives" className="pb-2">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                            <span className="h-4 w-1 rounded-full bg-primary" />
                            {t('user.relatives')}
                        </h3>
                        <Button
                            variant="soft"
                            size="xs"
                            icon={<Plus className="size-3.5" />}
                            onClick={handleAddRelative}
                        >
                            {t('user.addRelative')}
                        </Button>
                    </div>
                    {(form.relatives || []).length === 0 ? (
                        <p className="rounded-xl border border-dashed border-line-strong px-4 py-4 text-center text-sm text-ink-3">
                            Родичів ще не додано
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {(form.relatives || []).map((rel, idx) => (
                                <li
                                    key={idx}
                                    className="grid grid-cols-1 items-center gap-2 rounded-xl border border-line p-2.5 @xl:grid-cols-[1fr_1fr_1fr_auto]"
                                >
                                    <input
                                        className="field field-sm"
                                        placeholder={t('user.relativeName')}
                                        value={rel.name || ''}
                                        onChange={(e) =>
                                            handleRelativeChange(idx, 'name', e.target.value)
                                        }
                                    />
                                    <input
                                        className="field field-sm"
                                        placeholder={t('user.relativeRelation')}
                                        value={rel.relationship || ''}
                                        onChange={(e) =>
                                            handleRelativeChange(
                                                idx,
                                                'relationship',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <input
                                        className="field field-sm"
                                        placeholder={t('user.relativePhone')}
                                        value={rel.phone || ''}
                                        onChange={(e) =>
                                            handleRelativeChange(idx, 'phone', e.target.value)
                                        }
                                    />
                                    <IconButton
                                        label="Прибрати"
                                        size="sm"
                                        className="hover:bg-danger-soft hover:text-danger-ink"
                                        onClick={() => handleRemoveRelative(idx)}
                                        icon={<Trash2 className="size-4" />}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </Modal>
    );
}
