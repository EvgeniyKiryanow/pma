import type {
    DirectiveInput,
    DirectiveRecord,
    DirectiveType,
} from '../../../shared/types/directive';
import { bridge, call } from './bridge';

/** Orders (розпорядження), exclusions (виключення), restorations (відновлення). */
export const directivesApi = {
    list: (type: DirectiveType): Promise<DirectiveRecord[]> =>
        call(bridge().directives.getAllByType(type)),
    add: (entry: DirectiveInput): Promise<void> => call(bridge().directives.add(entry)),
    remove: (id: number): Promise<void> => call(bridge().directives.deleteById(id)),
    /** Every directive of the person dated `date`. */
    removeByUserAndDate: (userId: number, date: string): Promise<void> =>
        call(bridge().directives.delete({ userId, date })),
    clear: (type: DirectiveType): Promise<void> => call(bridge().directives.clearByType(type)),
};
