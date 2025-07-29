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
};

export const useUserStore = create<UserStore>((set, get) => ({
    users: [],
    selectedUser: null,
    editingUser: null,
    isUserFormOpen: false,
    currentTab: 'manager',

    sidebarCollapsed: false,
    setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),
    headerCollapsed: false,
    setHeaderCollapsed: (value) => set({ headerCollapsed: value }),
    setCurrentTab: (tab: any) => set({ currentTab: tab }),
    clearUser: () =>
        set({
            users: [],
            selectedUser: null,
            editingUser: null,
            isUserFormOpen: false,
        }),

    openUserFormForAdd: () => set({ editingUser: null, isUserFormOpen: true }),
    openUserFormForEdit: (user) => set({ editingUser: user, isUserFormOpen: true }),
    closeUserForm: () => set({ editingUser: null, isUserFormOpen: false }),

    refreshUsersFromDb: async () => {
        const users = await window.electronAPI.fetchUsers();
        set({ users });
    },

    fetchUsers: async () => {
        const users: User[] = await window.electronAPI.fetchUsers();
        set({ users });
    },

    addUser: async (user) => {
        const newUser: User = await window.electronAPI.addUser(user);
        set((state) => ({ users: [...state.users, newUser] }));
        const users = await window.electronAPI.fetchUsers();
        set({ users });
    },

    updateUser: async (user) => {
        const updatedUser: User = await window.electronAPI.updateUser(user);
        set((state) => ({
            users: state.users.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
            selectedUser:
                get().selectedUser?.id === updatedUser.id ? updatedUser : get().selectedUser,
        }));
        const users = await window.electronAPI.fetchUsers();
        set({ users });
    },

    deleteUser: async (userId) => {
        const success: boolean = await window.electronAPI.deleteUser(userId);
        if (success) {
            set((state) => ({
                users: state.users.filter((u) => u.id !== userId),
                selectedUser: get().selectedUser?.id === userId ? null : get().selectedUser,
            }));
        }
        const users = await window.electronAPI.fetchUsers();
        set({ users });
    },

    setSelectedUser: (user: User | null) => set({ selectedUser: user }),
}));
