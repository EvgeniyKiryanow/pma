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

    const infoRow = (label: string, value: string | boolean | undefined | null) => (
        <div>
            <span className="block text-sm text-gray-500">{label}</span>
            <p>
                {value !== undefined && value !== null && String(value).trim() !== ''
                    ? String(value)
                    : '—'}
            </p>
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
                        {/* ✅ Unit Hierarchy Section */}
                        <section className="bg-gray-50 border rounded p-4 shadow-sm">
                            <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                                {t('sections.hierarchy')}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                                {infoRow(t('user.unitMain'), user.unitMain)}
                                {infoRow(t('user.unitLevel1'), user.unitLevel1)}
                                {infoRow(t('user.unitLevel2'), user.unitLevel2)}
                                {infoRow(t('user.platoon'), user.platoon)}
                                {infoRow(t('user.squad'), user.squad)}
                                {infoRow(t('user.subordination'), user.subordination)}
                            </div>
                        </section>

                        {/* ✅ Military Specialization */}
                        <section className="bg-gray-50 border rounded p-4 shadow-sm">
                            <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                                {t('sections.militarySpecialization')}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                                {infoRow(t('user.vosCode'), user.vosCode)}
                                {infoRow(t('user.shpkCode'), user.shpkCode)}
                                {infoRow(t('user.category'), user.category)}
                                {infoRow(t('user.kshp'), user.kshp)}
                            </div>
                        </section>

                        {/* ✅ Rank & Appointment */}
                        <section className="bg-gray-50 border rounded p-4 shadow-sm">
                            <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                                {t('sections.rankAndAppointment')}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                                {infoRow(t('user.rankAssignedBy'), user.rankAssignedBy)}
                                {infoRow(t('user.rankAssignmentDate'), user.rankAssignmentDate)}
                                {infoRow(t('user.appointmentOrder'), user.appointmentOrder)}
                                {infoRow(t('user.previousStatus'), user.previousStatus)}
                            </div>
                        </section>

                        {/* ✅ Personal Details */}
                        <section className="bg-gray-50 border rounded p-4 shadow-sm">
                            <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                                {t('sections.personalDetails')}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                                {infoRow(t('user.placeOfBirth'), user.placeOfBirth)}
                                {infoRow(t('user.taxId'), user.taxId)}
                                {infoRow(t('user.serviceType'), user.serviceType)}
                                {infoRow(
                                    t('user.recruitmentOfficeDetails'),
                                    user.recruitmentOfficeDetails,
                                )}
                                {infoRow(t('user.ubdStatus'), user.ubdStatus)}
                                {infoRow(t('user.childrenInfo'), user.childrenInfo)}
                                {infoRow(t('user.gender'), user.gender)}
                            </div>
                        </section>

                        {/* ✅ Absence/Status */}
                        <section className="bg-gray-50 border rounded p-4 shadow-sm">
                            <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                                {t('sections.absenceStatus')}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                                {infoRow(t('user.bzvpStatus'), user.bzvpStatus)}
                                {infoRow(t('user.rvbzPresence'), user.rvbzPresence)}
                                {infoRow(t('user.absenceReason'), user.absenceReason)}
                                {infoRow(t('user.absenceFromDate'), user.absenceFromDate)}
                                {infoRow(t('user.absenceToDate'), user.absenceToDate)}
                            </div>
                        </section>

                        {/* ✅ Excel-specific fields */}
                        <section className="bg-gray-50 border rounded p-4 shadow-sm">
                            <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                                {t('sections.positionCases')}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                                {infoRow(t('user.positionNominative'), user.positionNominative)}
                                {infoRow(t('user.positionGenitive'), user.positionGenitive)}
                                {infoRow(t('user.positionDative'), user.positionDative)}
                                {infoRow(t('user.positionInstrumental'), user.positionInstrumental)}
                                {infoRow(t('user.tDotData'), user.tDotData)}
                                {infoRow(
                                    t('user.personalPrisonFileExists'),
                                    user.personalPrisonFileExists ? t('yes') : '—',
                                )}
                            </div>
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
