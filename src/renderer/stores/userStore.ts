import { create } from 'zustand';

import type { User } from '../../shared/types/user';
import { isTabKey, type TabKey } from '../app/tabKeys';

export type { TabKey };

/** Last opened tab is a per-computer convenience only; access is decided by permissions. */
function readLastTab(): TabKey {
    try {
        const saved = localStorage.getItem('lastTab');
        return isTabKey(saved) ? saved : 'manager';
    } catch {
        return 'manager';
    }
}

type UserStore = {
    users: User[];
    selectedUser: User | null;
    editingUser: User | null;
    isUserFormOpen: boolean;

    currentTab: TabKey;
    setCurrentTab: (tab: TabKey) => void;

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

    currentTab: readLastTab(),
    setCurrentTab: (tab) => {
        try {
            localStorage.setItem('lastTab', tab);
        } catch {
            // storage unavailable: the tab still switches for this session
        }
        set({ currentTab: tab });
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

    getUserById: (id) => window.electronAPI.users.getOne(id),

    openUserFormForAdd: () => set({ editingUser: null, isUserFormOpen: true }),
    openUserFormForEdit: (user) => set({ editingUser: user, isUserFormOpen: true }),
    closeUserForm: () => set({ editingUser: null, isUserFormOpen: false }),

    refreshUsersFromDb: async () => {
        set({ users: await window.electronAPI.fetchUsersMetadata() });
    },

    fetchUsers: async () => {
        set({ users: await window.electronAPI.fetchUsersMetadata() });
    },

    addUser: async (user) => {
        await window.electronAPI.addUser(user);
        set({ users: await window.electronAPI.fetchUsersMetadata() });
    },

    updateUser: async (user) => {
        const updatedUser = await window.electronAPI.updateUser(user);
        const users = await window.electronAPI.fetchUsersMetadata();
        set({
            users,
            selectedUser:
                get().selectedUser?.id === updatedUser?.id ? updatedUser : get().selectedUser,
        });
    },

    deleteUser: async (userId) => {
        const success = await window.electronAPI.deleteUser(userId);
        if (!success) return;
        set({
            users: await window.electronAPI.fetchUsersMetadata(),
            selectedUser: get().selectedUser?.id === userId ? null : get().selectedUser,
        });
    },

    setSelectedUser: async (user: User | null) => {
        if (!user) return set({ selectedUser: null });

        const current = get().selectedUser;
        if (current?.id === user.id && current.history && current.comments) return;

        const fullUser = await window.electronAPI.users.getOne(user.id);
        if (fullUser) set({ selectedUser: fullUser });
    },
}));
