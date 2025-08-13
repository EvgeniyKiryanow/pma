import './styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';

import { Main } from './app/MainRouter';

const isProd = window.location.protocol === 'file:';
const Router: any = isProd ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Router>
            <Main />
        </Router>
    </StrictMode>,
);
