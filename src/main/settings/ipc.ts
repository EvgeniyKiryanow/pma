import { SETTINGS_CHANNELS } from '../../shared/ipc/channels';
import type { SecuritySettings, UnitInfo } from '../../shared/types/settings';
import { access, handleResult } from '../ipc/secureHandle';
import { requireObject } from '../ipc/validate';
import type { SettingsService } from './SettingsService';

export function registerSettingsIpc(settings: SettingsService): void {
    // Everyone signed in may know when their screen will lock; only administrators change it.
    handleResult(SETTINGS_CHANNELS.getSecurity, access.authenticated, () => settings.getSecurity());

    handleResult(
        SETTINGS_CHANNELS.updateSecurity,
        access.any('security.manage'),
        (_event, patch: unknown) =>
            settings.updateSecurity(requireObject(patch, 'patch') as Partial<SecuritySettings>),
        { audit: 'settings.update-security' },
    );

    // Unit details are filled in where documents are generated.
    handleResult(SETTINGS_CHANNELS.getUnitInfo, access.any('reports.view'), () =>
        settings.getUnitInfo(),
    );

    handleResult(
        SETTINGS_CHANNELS.updateUnitInfo,
        access.any('reports.view'),
        (_event, info: unknown) =>
            settings.updateUnitInfo(
                info === null ? null : (requireObject(info, 'unitInfo') as UnitInfo),
            ),
        { audit: 'settings.update-unit-info' },
    );
}
