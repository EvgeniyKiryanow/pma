import './index';

import type { ElectronAPI } from '../preload/preload';

declare global {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Window {
        /** Typed bridge defined in src/preload/preload.ts. */
        electronAPI: ElectronAPI;
    }
}
