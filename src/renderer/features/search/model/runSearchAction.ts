import { findAward } from '../../../../shared/awards/catalog';
import { useSearchJump } from '../../../stores/searchJumpStore';
import { useUserStore } from '../../../stores/userStore';
import type { SearchAction } from './globalSearch';

function openPerson(userId: number, edit = false): void {
    const store = useUserStore.getState();
    const user = store.users.find((u) => u.id === userId);
    if (!user) return;
    store.setCurrentTab('manager');
    void store.setSelectedUser(user);
    if (edit) store.openUserFormForEdit(user);
}

/** Takes the person to what they chose in the global search. */
export function runSearchAction(action: SearchAction, { edit = false } = {}): void {
    const store = useUserStore.getState();
    const { jump } = useSearchJump.getState();
    switch (action.type) {
        case 'person':
        case 'order':
            openPerson(action.userId, edit);
            return;
        case 'position':
            if (action.holderId && !edit) {
                openPerson(action.holderId);
                return;
            }
            jump({ staffing: action.shtatNumber });
            store.setCurrentTab('shtatni');
            return;
        case 'journal':
            jump({ journal: action.uuid });
            store.setCurrentTab('journal');
            return;
        case 'award':
            jump({ awards: findAward(action.awardId)?.name ?? '' });
            store.setCurrentTab('awards');
            return;
        case 'report':
            jump({ reports: { view: 'yourSaved', query: action.name } });
            store.setCurrentTab('reports');
            return;
        case 'template':
            jump({ reports: { view: 'upload', templateId: action.templateId } });
            store.setCurrentTab('reports');
            return;
        case 'tab':
            store.setCurrentTab(action.tab);
            return;
        case 'command':
            store.setCurrentTab('manager');
            store.openUserFormForAdd();
            return;
    }
}
