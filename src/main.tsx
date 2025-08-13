import './styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';

import { Main } from './renderer/app/MainRouter';
import DefaultAdminPanel from './renderer/pages/DefaultAdminPanel';

const isProd = window.location.protocol === 'file:'; // працює скрізь
const Router: any = isProd ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Router>
            <Routes>
                <Route path="/*" element={<Main />} />
                <Route path="/default-admin" element={<DefaultAdminPanel />} />
            </Routes>
        </Router>
    </StrictMode>,
);
