import '@fontsource-variable/geologica';
import './styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import ErrorBoundary from './app/ErrorBoundary';
import { Main } from './app/MainRouter';
import { installGlobalErrorHandlers } from './shared/api/errors';
import { initUiPreferences } from './stores/uiStore';

// Theme and scale are applied before the first render so the window never flashes.
initUiPreferences();
// Unhandled failures become a readable notification instead of a silent console line.
installGlobalErrorHandlers();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary>
            <Main />
        </ErrorBoundary>
    </StrictMode>,
);
