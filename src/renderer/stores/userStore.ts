// src/app/stores/userStore.ts
import { create } from 'zustand';

import type { User } from '../../shared/types/user';

export type TabKey =
    | 'manager'
    | 'backups'
    | 'reminders'
    | 'reports'
    | 'tables'
    | 'instructions'
    | 'importUsers'
    | 'shtatni'
    | 'admin';

const ALL_TABS: TabKey[] = [
    'manager',
    'backups',
    'reminders',
    'reports',
    'tables',
    'instructions',
    'importUsers',
    'shtatni',
    'admin',
];

function readAllowed(): TabKey[] {
    try {
        const raw = localStorage.getItem('allowedTabs');
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr.filter((t: any) => ALL_TABS.includes(t)) : [];
    } catch {
        return [];
    }
}

const savedAllowed = readAllowed();
const savedLast = (localStorage.getItem('lastTab') as TabKey | null) || null;
const initialTab =
    savedAllowed.length && savedLast && savedAllowed.includes(savedLast)
        ? savedLast
        : (savedAllowed[0] ?? 'manager');

type UserStore = {
    users: User[];
    selectedUser: User | null;
    editingUser: User | null;
    isUserFormOpen: boolean;

    currentTab: TabKey | null;
    setCurrentTab: (tab: TabKey) => void;

    allowedTabs: TabKey[];
    setAllowedTabs: (tabs: TabKey[]) => void;
    clearAuth: () => void;

    clearUser: () => void;
    openUserFormForAdd: () => void;
    openUserFormForEdit: (user: User) => void;
    closeUserForm: () => void;

    fetchUsers: () => Promise<void>;
    addUser: (user: Omit<User, 'id'>) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    deleteUser: (userId: number) => Promise<void>;
    setSelectedUser: (user: User | null) => void;
    refreshUsersFromDb: () => Promise<void>;

    sidebarCollapsed: boolean;
    setSidebarCollapsed: (val: boolean) => void;

    headerCollapsed: boolean;
    setHeaderCollapsed: (value: boolean) => void;
    getUserById: (id: number) => Promise<User | null>;
};

export const useUserStore = create<UserStore>((set, get) => ({
    users: [],
    selectedUser: null,
    editingUser: null,
    isUserFormOpen: false,

    // 🔹 Hydrate on startup
    currentTab: initialTab,
    setCurrentTab: (tab) => {
        const { allowedTabs } = get();
        if (allowedTabs.length && !allowedTabs.includes(tab)) return; // hard guard
        localStorage.setItem('lastTab', tab);
        set({ currentTab: tab });
    },

    allowedTabs: savedAllowed,
    setAllowedTabs: (tabs) => {
        const valid = tabs.filter((t) => ALL_TABS.includes(t as TabKey)) as TabKey[];
        localStorage.setItem('allowedTabs', JSON.stringify(valid));
        const { currentTab } = get();
        const next =
            valid.length === 0 ? 'manager' : valid.includes(currentTab) ? currentTab : valid[0];
        localStorage.setItem('lastTab', next);
        set({ allowedTabs: valid, currentTab: next });
    },

    clearAuth: () => {
        localStorage.removeItem('allowedTabs');
        localStorage.removeItem('lastTab');
        set({ allowedTabs: [], currentTab: 'manager' });
    },

    sidebarCollapsed: false,
    setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),
    headerCollapsed: false,
    setHeaderCollapsed: (value) => set({ headerCollapsed: value }),

    clearUser: () =>
        set({
            users: [],
            selectedUser: null,
            editingUser: null,
            isUserFormOpen: false,
        }),

    getUserById: async (id: number): Promise<User | null> => {
        const user: User | null = await window.electronAPI.users.getOne(id);
        return user;
    },

    openUserFormForAdd: () => set({ editingUser: null, isUserFormOpen: true }),
    openUserFormForEdit: (user) => set({ editingUser: user, isUserFormOpen: true }),
    closeUserForm: () => set({ editingUser: null, isUserFormOpen: false }),

    refreshUsersFromDb: async () => {
        const users = await window.electronAPI.fetchUsersMetadata();
        set({ users });
    },

    fetchUsers: async () => {
        const users: User[] = await window.electronAPI.fetchUsersMetadata();
        set({ users });
    },

    addUser: async (user) => {
        await window.electronAPI.addUser(user);
        const users = await window.electronAPI.fetchUsersMetadata();
        set({ users });
    },

    updateUser: async (user) => {
        const updatedUser: User = await window.electronAPI.updateUser(user);
        const users = await window.electronAPI.fetchUsersMetadata();
        set({
            users,
            selectedUser:
                get().selectedUser?.id === updatedUser.id ? updatedUser : get().selectedUser,
        });
    },

    deleteUser: async (userId) => {
        const success: boolean = await window.electronAPI.deleteUser(userId);
        if (success) {
            const users = await window.electronAPI.fetchUsersMetadata();
            set({
                users,
                selectedUser: get().selectedUser?.id === userId ? null : get().selectedUser,
            });
        }
    },

    setSelectedUser: async (user: User | null) => {
        if (!user) return set({ selectedUser: null });

        const current = get().selectedUser;
        if (current?.id === user.id && current.history && current.comments) return;

        const fullUser = await window.electronAPI.users.getOne(user.id);
        if (fullUser) set({ selectedUser: fullUser });
    },
}));
