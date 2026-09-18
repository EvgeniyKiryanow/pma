import { create } from 'zustand';

import type { User } from '../../shared/types/user';
import { isTabKey, type TabKey } from '../app/tabKeys';
import { personnelApi } from '../shared/api/personnel';

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

    /** Incremented after history changes; history views reload when it changes. */
    historyVersion: number;
    /**
     * Reloads the personnel list and the open dossier after a change (status, history,
     * order...), keeping the same person selected.
     */
    refreshAfterChange: () => Promise<void>;
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

    getUserById: (id) => personnelApi.get(id),

    historyVersion: 0,
    refreshAfterChange: async () => {
        const users = await personnelApi.list();
        const selectedId = get().selectedUser?.id;
        const selectedUser =
            selectedId !== undefined && users.some((u) => u.id === selectedId)
                ? await personnelApi.get(selectedId)
                : null;
        set((state) => ({
            users,
            selectedUser,
            historyVersion: state.historyVersion + 1,
        }));
    },

    openUserFormForAdd: () => set({ editingUser: null, isUserFormOpen: true }),
    openUserFormForEdit: (user) => set({ editingUser: user, isUserFormOpen: true }),
    closeUserForm: () => set({ editingUser: null, isUserFormOpen: false }),

    refreshUsersFromDb: async () => {
        set({ users: await personnelApi.list() });
    },

    fetchUsers: async () => {
        set({ users: await personnelApi.list() });
    },

    // Mutations throw ApiError on failure (the caller shows it); the list is only
    // refreshed after the change was actually saved.
    addUser: async (user) => {
        await personnelApi.create(user);
        set({ users: await personnelApi.list() });
    },

    updateUser: async (user) => {
        const updatedUser = await personnelApi.update(user);
        const users = await personnelApi.list();
        set({
            users,
            selectedUser:
                get().selectedUser?.id === updatedUser.id ? updatedUser : get().selectedUser,
        });
    },

    deleteUser: async (userId) => {
        await personnelApi.remove(userId);
        set({
            users: await personnelApi.list(),
            selectedUser: get().selectedUser?.id === userId ? null : get().selectedUser,
        });
    },

    setSelectedUser: async (user: User | null) => {
        if (!user) return set({ selectedUser: null });

        const current = get().selectedUser;
        if (current?.id === user.id && current.history && current.comments) return;

        const fullUser = await personnelApi.get(user.id);
        if (fullUser) set({ selectedUser: fullUser });
    },
}));
