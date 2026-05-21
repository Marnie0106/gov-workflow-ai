import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import LoginPage        from './pages/LoginPage';
import Layout           from './components/Layout';
import CitizenPage      from './pages/CitizenPage';
import DispatcherPage   from './pages/DispatcherPage';
import ProcessAdminPage from './pages/ProcessAdminPage';
import LeaderPage       from './pages/LeaderPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/citizen"       element={<CitizenPage />} />
          <Route path="/dispatcher"    element={<DispatcherPage />} />
          <Route path="/process-admin" element={<ProcessAdminPage />} />
          <Route path="/leader"        element={<LeaderPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
