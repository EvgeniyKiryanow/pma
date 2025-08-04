import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

import { Main } from './MainRouter';
import DefaultAdminPanel from './Pages/DefaultAdminPanel';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/*" element={<Main />} />
                <Route path="/default-admin" element={<DefaultAdminPanel />} />
            </Routes>
        </BrowserRouter>
    </StrictMode>,
);
