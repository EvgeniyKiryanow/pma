import { useSyncExternalStore } from 'react';
import { create } from 'zustand';

import { systemApi } from '../shared/api/system';

/**
 * Per-computer interface preferences: theme, interface scale and the navigation panel.
 * Stored in localStorage only — they are conveniences, not data.
 */

export type ThemePreference = 'light' | 'dark' | 'system';

export const ZOOM_STEPS = [0.75, 0.8, 0.9, 1, 1.1, 1.25] as const;
const DEFAULT_ZOOM = 1;

const KEYS = {
    theme: 'ui.theme',
    zoom: 'ui.zoom',
    navMode: 'ui.navMode',
} as const;

export type NavMode = 'auto' | 'expanded' | 'collapsed';

function read(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function write(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        // storage unavailable: the preference still applies for this session
    }
}

function readTheme(): ThemePreference {
    const value = read(KEYS.theme);
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'light';
}

function readNavMode(): NavMode {
    const value = read(KEYS.navMode);
    return value === 'expanded' || value === 'collapsed' ? value : 'auto';
}

function readZoom(): number {
    const value = Number(read(KEYS.zoom));
    return ZOOM_STEPS.includes(value as (typeof ZOOM_STEPS)[number]) ? value : DEFAULT_ZOOM;
}

const darkQuery = (): MediaQueryList | null =>
    typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;

function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
    if (preference === 'system') return darkQuery()?.matches ? 'dark' : 'light';
    return preference;
}

function applyTheme(preference: ThemePreference): 'light' | 'dark' {
    const resolved = resolveTheme(preference);
    document.documentElement.dataset.theme = resolved;
    return resolved;
}

function applyZoom(zoom: number): void {
    systemApi.setZoomFactor(zoom);
}

type UiStore = {
    theme: ThemePreference;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: ThemePreference) => void;
    toggleTheme: () => void;

    zoom: number;
    setZoom: (zoom: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;

    /** `auto` folds the menu on narrow windows; the toggle sets an explicit choice. */
    navMode: NavMode;
    setNavMode: (mode: NavMode) => void;
};

const initialTheme = readTheme();

export const useUiStore = create<UiStore>((set, get) => ({
    theme: initialTheme,
    resolvedTheme: resolveTheme(initialTheme),
    setTheme: (theme) => {
        write(KEYS.theme, theme);
        set({ theme, resolvedTheme: applyTheme(theme) });
    },
    toggleTheme: () => get().setTheme(get().resolvedTheme === 'dark' ? 'light' : 'dark'),

    zoom: readZoom(),
    setZoom: (zoom) => {
        const next = ZOOM_STEPS.reduce((best, step) =>
            Math.abs(step - zoom) < Math.abs(best - zoom) ? step : best,
        );
        write(KEYS.zoom, String(next));
        applyZoom(next);
        set({ zoom: next });
    },
    zoomIn: () => {
        const index = ZOOM_STEPS.indexOf(get().zoom as (typeof ZOOM_STEPS)[number]);
        get().setZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, index + 1)]);
    },
    zoomOut: () => {
        const index = ZOOM_STEPS.indexOf(get().zoom as (typeof ZOOM_STEPS)[number]);
        get().setZoom(ZOOM_STEPS[Math.max(0, index - 1)]);
    },
    resetZoom: () => get().setZoom(DEFAULT_ZOOM),

    navMode: readNavMode(),
    setNavMode: (navMode) => {
        write(KEYS.navMode, navMode);
        set({ navMode });
    },
}));

/** Below this width (CSS px, so it already accounts for the interface scale) the menu folds. */
const NARROW_WIDTH = 1180;

const subscribeResize = (callback: () => void) => {
    window.addEventListener('resize', callback);
    return () => window.removeEventListener('resize', callback);
};

export function useIsNarrowWindow(): boolean {
    return useSyncExternalStore(subscribeResize, () => window.innerWidth < NARROW_WIDTH);
}

export const NAV_WIDTH = { expanded: 232, collapsed: 68 } as const;

/** Navigation panel state: folded by the user or automatically on a narrow window. */
export function useNavLayout(): { collapsed: boolean; width: number; toggle: () => void } {
    const mode = useUiStore((s) => s.navMode);
    const setNavMode = useUiStore((s) => s.setNavMode);
    const narrow = useIsNarrowWindow();
    const collapsed = mode === 'collapsed' || (mode === 'auto' && narrow);
    return {
        collapsed,
        width: collapsed ? NAV_WIDTH.collapsed : NAV_WIDTH.expanded,
        toggle: () => setNavMode(collapsed ? 'expanded' : 'collapsed'),
    };
}

/**
 * Applies stored preferences before the first render (no flash of the wrong theme) and keeps
 * "system" in sync with Windows. Also wires the Ctrl +/-/0 shortcuts for the interface scale.
 */
export function initUiPreferences(): void {
    const { theme, zoom } = useUiStore.getState();
    applyTheme(theme);
    applyZoom(zoom);

    darkQuery()?.addEventListener('change', () => {
        const state = useUiStore.getState();
        if (state.theme === 'system') useUiStore.setState({ resolvedTheme: applyTheme('system') });
    });

    window.addEventListener('keydown', (event) => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
        const ui = useUiStore.getState();
        if (event.key === '=' || event.key === '+') ui.zoomIn();
        else if (event.key === '-' || event.key === '_') ui.zoomOut();
        else if (event.key === '0') ui.resetZoom();
        else return;
        event.preventDefault();
    });
}
