export type SourceType = 'default_admin' | 'auth_user';
export type Role = 'user' | 'admin' | 'default_admin';

export type FullUser = {
    id: number;
    username: string;
    password?: string;
    recovery_hint: string | null;
    key: string;
    role: Role;
    source: SourceType;
};

export type NewUserState = {
    username: string;
    password: string;
    recovery_hint: string;
    role: 'user' | 'admin';
};
