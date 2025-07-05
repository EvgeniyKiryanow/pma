import { create } from "zustand";
import type { User } from "../types/user";
import mockUsers from "../mock/userMock";

type UserStore = {
  clearUser: any;
  users: User[];
  selectedUser: User | null;
  isUserFormOpen: boolean;
  editingUser: User | null;

  openUserFormForAdd: () => void;
  openUserFormForEdit: (user: User) => void;
  closeUserForm: () => void;

  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  fetchUsers: () => void;
  setSelectedUser: (user: User | null) => void;
  userToEdit: null;
};

export const useUserStore = create<UserStore>((set) => ({
  users: [],
  selectedUser: null,
  isUserFormOpen: false,
  editingUser: null,
  userToEdit: null,
  clearUser: () =>
    set({
      selectedUser: null,
      users: [],
      isUserFormOpen: false,
      editingUser: null,
    }),

  openUserFormForAdd: () => set({ editingUser: null, isUserFormOpen: true }),
  openUserFormForEdit: (user) =>
    set({ editingUser: user, isUserFormOpen: true }),
  closeUserForm: () => set({ isUserFormOpen: false, editingUser: null }),

  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  updateUser: (updatedUser) =>
    set((state) => ({
      users: state.users.map((u) =>
        u.id === updatedUser.id ? updatedUser : u
      ),
      selectedUser:
        state.selectedUser?.id === updatedUser.id
          ? updatedUser
          : state.selectedUser,
    })),

  fetchUsers: async () => {
    const users = await window.electronAPI.fetchUsers();
    set({ users });
  },

  setSelectedUser: (user) => set({ selectedUser: user }),
}));
