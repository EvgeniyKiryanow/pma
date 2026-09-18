import { defineModule, type ModuleContext } from '../app/module';
import { AwardTypeRepository } from './AwardTypeRepository';
import { AwardTypeService } from './AwardTypeService';
import { type AwardFileReader, registerAwardIpc } from './ipc';

/** The awards register: the unit's own awards and the documents of awards in the cards. */
export function createAwardsModule(context: ModuleContext, deps: { files: AwardFileReader }) {
    const types = new AwardTypeService(
        context.transactor,
        new AwardTypeRepository(context.db),
        context.journal,
    );
    return defineModule({
        name: 'awards',
        types,
        registerIpc: () => registerAwardIpc(types, deps.files),
    });
}
