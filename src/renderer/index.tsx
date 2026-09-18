import './styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import ErrorBoundary from './app/ErrorBoundary';
import { Main } from './app/MainRouter';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary>
            <Main />
        </ErrorBoundary>
    </StrictMode>,
);
