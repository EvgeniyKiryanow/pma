import { useState, useMemo } from 'react';
import { UserCircle } from 'lucide-react';
import type { User } from '../../types/user';
import { useI18nStore } from '../../stores/i18nStore';
import { useUserStore } from '../../stores/userStore'; // ✅ subscribe to store
import UserCard from './UserCard';

type Props = {
    user: User;
};

export default function UserInfoDetails({ user }: Props) {
    const { t } = useI18nStore();
    const [showFullInfo, setShowFullInfo] = useState(false);

    // ✅ always get the freshest user from the store
    const { users } = useUserStore();
    const liveUser = useMemo(() => {
        const fromStore = users.find((u) => u.id === user.id);
        return fromStore || user;
    }, [users, user]);

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
        <div className="space-y-8">
            {/* ✅ User card with avatar & main info */}
            <section>
                <UserCard user={liveUser} />
            </section>

            {/* ✅ Basic Info */}
            <section className="bg-gray-50 border rounded p-4 shadow-sm">
                <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                    <UserCircle className="w-5 h-5" /> {t('sections.basic')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                    {infoRow(t('user.fullName'), liveUser.fullName)}
                    {infoRow(t('user.dateOfBirth'), liveUser.dateOfBirth)}
                    {infoRow(t('user.phoneNumber'), liveUser.phoneNumber)}
                    {infoRow(t('user.email'), liveUser.email)}

                    {/* ✅ SHOW номер по штату */}
                    {infoRow('Номер по штату', liveUser.shtatNumber)}

                    {infoRow(t('user.position'), liveUser.position)}
                    {infoRow(t('user.rank'), liveUser.rank)}
                    {infoRow(t('user.rights'), liveUser.rights)}
                    {infoRow(t('user.callsign'), liveUser.callsign)}
                    {infoRow(t('user.education'), liveUser.education)}
                    {infoRow(t('user.awards'), liveUser.awards)}
                    {infoRow(t('user.notes'), liveUser.notes)}
                </div>

                {/* Toggle More Info */}
                <div className="flex justify-center mt-4">
                    <button
                        onClick={() => setShowFullInfo((prev) => !prev)}
                        className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-full shadow-sm transition"
                    >
                        {showFullInfo ? t('rightBar.showLess') : t('rightBar.showMore')}
                    </button>
                </div>
            </section>

            {/* ✅ Extra sections */}
            {showFullInfo && (
                <div className="space-y-6">
                    {/* Unit Hierarchy */}
                    <section className="bg-gray-50 border rounded p-4 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
                            {t('sections.hierarchy')}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                            {infoRow(t('user.unitMain'), liveUser.unitMain)}
                            {infoRow(t('user.unitLevel1'), liveUser.unitLevel1)}
                            {infoRow(t('user.unitLevel2'), liveUser.unitLevel2)}
                            {infoRow(t('user.platoon'), liveUser.platoon)}
                            {infoRow(t('user.squad'), liveUser.squad)}
                            {infoRow(t('user.subordination'), liveUser.subordination)}
                        </div>
                    </section>

                    {/* Military Specialization */}
                    <section className="bg-gray-50 border rounded p-4 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
                            {t('sections.militarySpecialization')}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                            {infoRow(t('user.vosCode'), liveUser.vosCode)}
                            {infoRow(t('user.shpkCode'), liveUser.shpkCode)}
                            {infoRow(t('user.category'), liveUser.category)}
                            {infoRow(t('user.kshp'), liveUser.kshp)}
                        </div>
                    </section>

                    {/* Rank & Appointment */}
                    <section className="bg-gray-50 border rounded p-4 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
                            {t('sections.rankAndAppointment')}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                            {infoRow(t('user.rankAssignedBy'), liveUser.rankAssignedBy)}
                            {infoRow(t('user.rankAssignmentDate'), liveUser.rankAssignmentDate)}
                            {infoRow(t('user.appointmentOrder'), liveUser.appointmentOrder)}
                            {infoRow(t('user.previousStatus'), liveUser.previousStatus)}
                        </div>
                    </section>

                    {/* Personal Details */}
                    <section className="bg-gray-50 border rounded p-4 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
                            {t('sections.personalDetails')}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                            {infoRow(t('user.placeOfBirth'), liveUser.placeOfBirth)}
                            {infoRow(t('user.taxId'), liveUser.taxId)}
                            {infoRow(t('user.serviceType'), liveUser.serviceType)}
                            {infoRow(
                                t('user.recruitmentOfficeDetails'),
                                liveUser.recruitmentOfficeDetails,
                            )}
                            {infoRow(t('user.ubdStatus'), liveUser.ubdStatus)}
                            {infoRow(t('user.childrenInfo'), liveUser.childrenInfo)}
                            {infoRow(t('user.gender'), liveUser.gender)}
                        </div>
                    </section>

                    {/* Absence & Status */}
                    <section className="bg-gray-50 border rounded p-4 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
                            {t('sections.absenceStatus')}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                            {infoRow(t('user.bzvpStatus'), liveUser.bzvpStatus)}
                            {infoRow(t('user.rvbzPresence'), liveUser.rvbzPresence)}
                            {infoRow(t('user.absenceReason'), liveUser.absenceReason)}
                            {infoRow(t('user.absenceFromDate'), liveUser.absenceFromDate)}
                            {infoRow(t('user.absenceToDate'), liveUser.absenceToDate)}
                        </div>
                    </section>

                    {/* Excel-specific */}
                    <section className="bg-gray-50 border rounded p-4 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
                            {t('sections.positionCases')}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                            {infoRow(t('user.positionNominative'), liveUser.positionNominative)}
                            {infoRow(t('user.tDotData'), liveUser.tDotData)}
                            {infoRow(
                                t('user.personalPrisonFileExists'),
                                liveUser.personalPrisonFileExists,
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
