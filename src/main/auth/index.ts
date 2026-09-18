import { defineModule, type ModuleContext } from '../app/module';
import { type DataKeyring, noKeyring } from './DataKeyring';
import { registerAccountsIpc, registerAuthIpc, registerRolesIpc } from './ipc';
import { PasswordHasher, PasswordPolicy } from './PasswordHasher';
import { RecoveryCodes } from './RecoveryCodes';
import { AccountRepository } from './repositories/AccountRepository';
import { RoleRepository } from './repositories/RoleRepository';
import { AccountService } from './services/AccountService';
import { AuthService } from './services/AuthService';
import { RoleService } from './services/RoleService';
import { SessionFactory } from './services/SessionFactory';
import type { SessionManager } from './SessionManager';

/** Sign-in, sessions, accounts and roles. */
export function createAuthModule(
    context: ModuleContext,
    sessions: SessionManager,
    keyring: DataKeyring = noKeyring,
) {
    const { db, transactor, createLogger } = context;
    const accountsRepo = new AccountRepository(db);
    const rolesRepo = new RoleRepository(db);
    const hasher = new PasswordHasher();
    const passwordPolicy = new PasswordPolicy();

    const auth = new AuthService(
        transactor,
        accountsRepo,
        rolesRepo,
        sessions,
        new SessionFactory(rolesRepo),
        hasher,
        passwordPolicy,
        new RecoveryCodes(),
        createLogger('auth'),
        undefined,
        keyring,
    );
    const accounts = new AccountService(
        transactor,
        accountsRepo,
        rolesRepo,
        hasher,
        passwordPolicy,
        auth,
        createLogger('accounts'),
        keyring,
    );
    const roles = new RoleService(transactor, rolesRepo, auth, createLogger('roles'));

    return defineModule({
        name: 'auth',
        auth,
        accounts,
        roles,
        registerIpc: () => {
            registerAuthIpc(auth);
            registerAccountsIpc(accounts);
            registerRolesIpc(roles);
        },
    });
}
