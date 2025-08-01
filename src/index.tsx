import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { Main } from './MainRouter';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            {' '}
            <Main />
        </BrowserRouter>
    </StrictMode>,
);
