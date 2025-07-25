import { useState } from 'react';
import { UserCircle, ClipboardList } from 'lucide-react';
import type { User } from '../../types/user';
import { useI18nStore } from '../../stores/i18nStore';
import UserCard from './UserCard';

type Props = {
    user: User;
};

export default function UserInfoDetails({ user }: Props) {
    const { t } = useI18nStore();
    const [showFullInfo, setShowFullInfo] = useState(false);

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
                <UserCard user={user} />
            </section>

            {/* ✅ Basic Info */}
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
                            {infoRow(t('user.unitMain'), user.unitMain)}
                            {infoRow(t('user.unitLevel1'), user.unitLevel1)}
                            {infoRow(t('user.unitLevel2'), user.unitLevel2)}
                            {infoRow(t('user.platoon'), user.platoon)}
                            {infoRow(t('user.squad'), user.squad)}
                            {infoRow(t('user.subordination'), user.subordination)}
                        </div>
                    </section>

                    {/* Military Specialization */}
                    <section className="bg-gray-50 border rounded p-4 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
                            {t('sections.militarySpecialization')}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                            {infoRow(t('user.vosCode'), user.vosCode)}
                            {infoRow(t('user.shpkCode'), user.shpkCode)}
                            {infoRow(t('user.category'), user.category)}
                            {infoRow(t('user.kshp'), user.kshp)}
                        </div>
                    </section>

                    {/* Rank & Appointment */}
                    <section className="bg-gray-50 border rounded p-4 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
                            {t('sections.rankAndAppointment')}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                            {infoRow(t('user.rankAssignedBy'), user.rankAssignedBy)}
                            {infoRow(t('user.rankAssignmentDate'), user.rankAssignmentDate)}
                            {infoRow(t('user.appointmentOrder'), user.appointmentOrder)}
                            {infoRow(t('user.previousStatus'), user.previousStatus)}
                        </div>
                    </section>

                    {/* Personal Details */}
                    <section className="bg-gray-50 border rounded p-4 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
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

                    {/* Absence & Status */}
                    <section className="bg-gray-50 border rounded p-4 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
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

                    {/* Excel-specific */}
                    <section className="bg-gray-50 border rounded p-4 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
                            {t('sections.positionCases')}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                            {infoRow(t('user.positionNominative'), user.positionNominative)}
                            {/* {infoRow(t('user.positionGenitive'), user.positionGenitive)}
                            {infoRow(t('user.positionDative'), user.positionDative)}
                            {infoRow(t('user.positionInstrumental'), user.positionInstrumental)} */}
                            {infoRow(t('user.tDotData'), user.tDotData)}
                            {infoRow(
                                t('user.personalPrisonFileExists'),
                                user.personalPrisonFileExists,
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
