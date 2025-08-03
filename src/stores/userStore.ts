import { create } from 'zustand';
import type { User } from '../types/user';

type UserStore = {
    users: User[];
    selectedUser: User | null;
    editingUser: User | null;
    isUserFormOpen: boolean;
    currentTab: 'manager';

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
    setCurrentTab: (tab: any) => void;

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
    currentTab: (localStorage.getItem('lastTab') as any) || 'manager',
    setCurrentTab: (tab: any) => {
        localStorage.setItem('lastTab', tab);
        set({ currentTab: tab });
    },

    sidebarCollapsed: false,
    setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),
    headerCollapsed: false,
    setHeaderCollapsed: (value) => set({ headerCollapsed: value }),
    // setCurrentTab: (tab: any) => set({ currentTab: tab }),
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
        const users = await window.electronAPI.fetchUsersMetadata(); // ✅ metadata only
        set({ users });
    },

    fetchUsers: async () => {
        const users: User[] = await window.electronAPI.fetchUsersMetadata(); // ✅ metadata only
        set({ users });
    },

    addUser: async (user) => {
        await window.electronAPI.addUser(user);
        const users = await window.electronAPI.fetchUsersMetadata();
        set({ users });
    },

    updateUser: async (user) => {
        const updatedUser: User = await window.electronAPI.updateUser(user);
        const users = await window.electronAPI.fetchUsersMetadata(); // ✅ refresh after update
        set({
            users,
            selectedUser:
                get().selectedUser?.id === updatedUser.id ? updatedUser : get().selectedUser,
        });
    },

    deleteUser: async (userId) => {
        const success: boolean = await window.electronAPI.deleteUser(userId);
        if (success) {
            const users = await window.electronAPI.fetchUsersMetadata(); // ✅ refresh after delete
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
        if (fullUser) {
            set({ selectedUser: fullUser });
        }
    },
}));
