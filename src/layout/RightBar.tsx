import { useState } from 'react';
import { useUserStore } from '../stores/userStore';
import type { User, CommentOrHistoryEntry } from '../types/user';
import UserCard from '../components/userInfo/UserCard';
import UserRelatives from '../components/userInfo/UserRelatives';
import UserHistory from '../components/userInfo/UserHistory';
import CommentsModal from '../components/userInfo/CommentsModal';
import {
    UserCircle,
    Phone,
    Mail,
    KeyRound,
    Info,
    ClipboardList,
    Edit3,
    MessageCircle,
    Trash2,
    ShieldCheck,
    HeartPulse,
    FileText,
    BadgeInfo,
    GraduationCap,
} from 'lucide-react';
import { useI18nStore } from '../stores/i18nStore';

export default function RightBar() {
    const [showComments, setShowComments] = useState(false);
    const [dbComments, setDbComments] = useState<CommentOrHistoryEntry[]>([]);
    const { t } = useI18nStore();

    const user = useUserStore((s) => s.selectedUser);
    const updateUser = useUserStore((s) => s.updateUser);
    const deleteUser = useUserStore((s) => s.deleteUser);
    const openUserFormForEdit = useUserStore((s) => s.openUserFormForEdit);
    const setSelectedUser = useUserStore((s) => s.setSelectedUser);
    const [showFullInfo, setShowFullInfo] = useState(false);

    const handleAddHistory = (newEntry: CommentOrHistoryEntry) => {
        if (!user) return;
        const updatedUser: User = { ...user, history: [...(user.history || []), newEntry] };
        updateUser(updatedUser);
    };

    const handleDeleteHistory = (id: number) => {
        if (!user) return;
        const updatedUser: User = {
            ...user,
            history: (user.history || []).filter((h) => h.id !== id),
        };
        updateUser(updatedUser);
    };

    const handleShowComments = async () => {
        if (!user) return;
        const comments = await window.electronAPI.getUserComments(user.id);
        setDbComments(comments);
        setShowComments(true);
    };

    const handleDeleteUser = async () => {
        if (!user) return;
        const confirmed = confirm(`${t('rightBar.confirmDelete')} ${user.fullName}?`);
        if (!confirmed) return;
        await deleteUser(user.id);
        setSelectedUser(null);
    };

    if (!user) {
        return (
            <aside className="flex-1 bg-gray-50 p-8 text-gray-500 flex items-center justify-center">
                <p className="text-lg italic">{t('rightBar.selectPrompt')}</p>
            </aside>
        );
    }

    const infoRow = (label: string, value: string | boolean | undefined) => (
        <div>
            <span className="block text-sm text-gray-500">{label}</span>
            <p>{value !== undefined && value !== '' ? String(value) : '—'}</p>
        </div>
    );

    return (
        <aside className="flex-1 bg-white px-4 sm:px-6 md:px-10 shadow-inner overflow-y-auto max-h-[calc(100vh-56px)]">
            <section className="sticky top-0 z-10 bg-white pt-4 pb-3 border-b mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={() => openUserFormForEdit(user)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded shadow"
                    >
                        <Edit3 className="w-4 h-4" /> {t('rightBar.edit')}
                    </button>
                    <button
                        onClick={handleShowComments}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
                    >
                        <MessageCircle className="w-4 h-4" /> {t('rightBar.comments')}
                    </button>
                    <button
                        onClick={handleDeleteUser}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded shadow"
                    >
                        <Trash2 className="w-4 h-4" /> {t('rightBar.delete')}
                    </button>
                </div>
            </section>

            <div className="max-w-3xl mx-auto space-y-8 pb-10">
                <section>
                    <UserCard user={user} />
                </section>

                <section className="bg-gray-50 border rounded p-4 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                        <UserCircle className="w-5 h-5" /> {t('sections.basic')}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                        {infoRow(t('user.fullName'), user.fullName)}
                        {infoRow(t('user.dateOfBirth'), user.dateOfBirth)}
                        {infoRow(t('user.phoneNumber'), user.phoneNumber)}
                        {infoRow(t('user.email'), user.email)}
                        {infoRow(t('user.position'), user.position)}
                        {infoRow(t('user.rank'), user.rank)}
                        {infoRow(t('user.rights'), user.rights)}
                        {infoRow(t('user.callsign'), user.callsign)}
                        {infoRow(t('user.education'), user.education)}
                        {infoRow(t('user.awards'), user.awards)}
                        {infoRow(t('user.notes'), user.notes)}
                    </div>
                    <div className="flex justify-center mt-4">
                        <button
                            onClick={() => setShowFullInfo((prev) => !prev)}
                            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-full shadow-sm transition"
                        >
                            {showFullInfo ? t('rightBar.showLess') : t('rightBar.showMore')}
                        </button>
                    </div>
                </section>

                {showFullInfo && (
                    <div className={`transition-all duration-300 ease-in-out`}>
                        <section className="bg-gray-50 border rounded p-4 shadow-sm">
                            <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                                <BadgeInfo className="w-5 h-5" /> {t('sections.military')}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                                {infoRow(t('user.passportData'), user.passportData)}
                                {infoRow(t('user.identificationNumber'), user.identificationNumber)}
                                {infoRow(t('user.participantNumber'), user.participantNumber)}
                                {infoRow(t('user.recruitingOffice'), user.recruitingOffice)}
                                {infoRow(t('user.unitNumber'), user.unitNumber)}
                                {infoRow(t('user.fitnessCategory'), user.fitnessCategory)}
                                {infoRow(t('user.militaryTicketInfo'), user.militaryTicketInfo)}
                                {infoRow(
                                    t('user.militaryServiceHistory'),
                                    user.militaryServiceHistory,
                                )}
                                {infoRow(t('user.conscriptionInfo'), user.conscriptionInfo)}
                            </div>
                        </section>

                        <section className="bg-gray-50 border rounded p-4 shadow-sm">
                            <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5" /> {t('sections.legal')}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                                {infoRow(
                                    t('user.hasCriminalRecord'),
                                    user.hasCriminalRecord ? t('yes') : t('no'),
                                )}
                                {user.hasCriminalRecord &&
                                    infoRow(
                                        t('user.criminalRecordDetails'),
                                        user.criminalRecordDetails,
                                    )}
                            </div>
                        </section>

                        <section className="bg-gray-50 border rounded p-4 shadow-sm">
                            <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                                <HeartPulse className="w-5 h-5" /> {t('sections.health')}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                                {infoRow(t('user.healthConditions'), user.healthConditions)}
                                {infoRow(t('user.bloodType'), user.bloodType)}
                            </div>
                        </section>

                        <section className="bg-gray-50 border rounded p-4 shadow-sm">
                            <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                                <GraduationCap className="w-5 h-5" /> {t('sections.background')}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                                {infoRow(t('user.civilProfession'), user.civilProfession)}
                                {infoRow(t('user.educationDetails'), user.educationDetails)}
                                {infoRow(t('user.residenceAddress'), user.residenceAddress)}
                                {infoRow(t('user.registeredAddress'), user.registeredAddress)}
                                {infoRow(t('user.maritalStatus'), user.maritalStatus)}
                                {infoRow(t('user.familyInfo'), user.familyInfo)}
                                {infoRow(t('user.religion'), user.religion)}
                                {infoRow(t('user.driverLicenses'), user.driverLicenses)}
                            </div>
                        </section>
                        <section className="border rounded p-4 shadow-sm">
                            <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                                <UserCircle className="w-5 h-5" /> {t('sections.relatives')}
                            </h2>
                            <UserRelatives relatives={user.relatives} />
                        </section>
                    </div>
                )}

                <section className="border rounded p-4 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" /> {t('rightBar.history')}
                    </h2>
                    <UserHistory
                        userId={user.id}
                        onAddHistory={handleAddHistory}
                        onDeleteHistory={handleDeleteHistory}
                    />
                </section>
            </div>

            {showComments && (
                <CommentsModal userId={user.id} onClose={() => setShowComments(false)} />
            )}
        </aside>
    );
}
