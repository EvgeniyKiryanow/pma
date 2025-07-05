import './index';
import type { User } from './types/user';

// console.log('👋 This message is being logged by "renderer.ts", included via Vite');

export {};

declare global {
  interface Window {
    electronAPI: {
      // DB backup
      downloadDb: () => Promise<boolean>;
    replaceDb: () => Promise<boolean>;
restoreDb: () => Promise<boolean>; 
      // User CRUD
      fetchUsers: () => Promise<User[]>;
      addUser: (user: Omit<User, 'id'>) => Promise<User>;
      updateUser: (user: User) => Promise<User>;
      deleteUser: (id: number) => Promise<boolean>;
    };
  }
}
