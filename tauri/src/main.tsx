import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n';
import { HashRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx'
import SessionWindow from './pages/SessionWindow.tsx'
import AuthorizeWindow from './pages/AuthorizeWindow.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/session/:id" element={<SessionWindow />} />
        <Route path="/authorize" element={<AuthorizeWindow />} />
      </Routes>
    </HashRouter>
  </StrictMode>
)
