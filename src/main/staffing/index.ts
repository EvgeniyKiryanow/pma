import { defineModule, type ModuleContext } from '../app/module';
import { registerStaffingIpc } from './ipc';
import { StaffingRepository } from './StaffingRepository';
import { StaffingService } from './StaffingService';

export function createStaffingModule(context: ModuleContext) {
    const service = new StaffingService(
        context.transactor,
        new StaffingRepository(context.db),
        context.journal,
    );
    return defineModule({
        name: 'staffing',
        service,
        registerIpc: () => registerStaffingIpc(service),
    });
}
