import { DIRECTIVE_CHANNELS } from '../../shared/ipc/channels';
import { DIRECTIVE_TYPES, type DirectiveInput } from '../../shared/types/directive';
import { access, handle } from '../ipc/secureHandle';
import { requireInt, requireObject, requireOneOf, requireString } from '../ipc/validate';
import type { DirectiveService } from './DirectiveService';

const requireType = (value: unknown) => requireOneOf(value, 'type', DIRECTIVE_TYPES);
const requireDate = (value: unknown, field = 'date') =>
    requireString(value, field, { maxLength: 40 });

function requireDirective(value: unknown): DirectiveInput {
    const entry = requireObject(value, 'entry') as DirectiveInput;
    requireType(entry.type);
    requireInt(entry.userId, 'entry.userId');
    requireString(entry.title, 'entry.title', { maxLength: 500 });
    requireDate(entry.date, 'entry.date');
    return entry;
}

export function registerDirectiveIpc(directives: DirectiveService): void {
    const edit = access.any('directives.edit');

    handle(
        DIRECTIVE_CHANNELS.add,
        edit,
        (_event, entry: unknown) => directives.add(requireDirective(entry)),
        { audit: 'directives.add' },
    );

    handle(
        DIRECTIVE_CHANNELS.removeById,
        edit,
        (_event, id: unknown) => directives.removeById(requireInt(id, 'id')),
        { audit: 'directives.delete' },
    );

    handle(
        DIRECTIVE_CHANNELS.removeByUserAndDate,
        edit,
        (_event, params: unknown) => {
            const { userId, date } = requireObject(params, 'params');
            return directives.removeByUserAndDate(requireInt(userId, 'userId'), requireDate(date));
        },
        { audit: 'directives.delete' },
    );

    handle(
        DIRECTIVE_CHANNELS.clearByType,
        edit,
        (_event, type: unknown) => directives.clearByType(requireType(type)),
        { audit: 'directives.clear-type' },
    );

    handle(DIRECTIVE_CHANNELS.listByType, access.any('directives.view'), (_event, type: unknown) =>
        directives.listByType(requireType(type)),
    );
}
