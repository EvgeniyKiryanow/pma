// src/layout/ManagerTab.tsx
import { useState } from 'react';
import LeftBar from './LeftBar';
import RightBar from './RightBar';
import RozporyadzhennyaTab from '../components/managerTabs/RozporyadzhennyaTab';
import VyklyucheniTab from '../components/managerTabs/VyklyucheniTab';
import { useUserStore } from '../stores/userStore';

const tabLabels = [
    { id: 'main', label: 'Штат / за списком' },
    { id: 'orders', label: 'Розпорядження' },
    { id: 'excluded', label: 'Виключені' },
];

export default function ManagerTab() {
    const [activeSubTab, setActiveSubTab] = useState<'main' | 'orders' | 'excluded'>('main');
    const users = useUserStore((s) => s.users);

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex border-b bg-white px-4 py-2 space-x-4">
                {tabLabels.map((tab) => (
                    <button
                        key={tab.id}
                        className={`px-3 py-1 rounded-md text-sm font-medium ${
                            activeSubTab === tab.id
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        onClick={() => setActiveSubTab(tab.id as any)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-hidden">
                {activeSubTab === 'main' ? (
                    <div className="flex h-full">
                        <LeftBar users={users} />
                        <RightBar />
                    </div>
                ) : activeSubTab === 'orders' ? (
                    <RozporyadzhennyaTab />
                ) : activeSubTab === 'excluded' ? (
                    <VyklyucheniTab />
                ) : null}
            </div>
        </div>
    );
}
