// src/App.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "./components/common/PrivateRoute";
import Layout from "./components/Layout/Layout";
import WorkerInterface from "./pages/WorkerInterface";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Rooms from "./pages/Rooms";
import CleaningHistory from "./pages/CleaningHistory";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Workers from "./pages/Workers";
import QRScan from "./pages/QRScan";
import QRRedirect from "./pages/QRRedirect"; // ✅ ADICIONE ESTA LINHA
import AdminLogin from "./pages/AdminLogin";
import WorkerLogin from "./pages/WorkerLogin";

function App() {
  return (
    <Routes>
      {/* Login */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/worker/login" element={<WorkerLogin />} />

      {/* ✅ ROTA PÚBLICA PARA QR CODE */}
      <Route path="/scan" element={<QRRedirect />} />
      <Route path="/qr/redirect" element={<QRRedirect />} />

      {/* Página raiz */}
      <Route path="/" element={<WorkerInterface />} />

      {/* Rotas autenticadas */}
      <Route element={<PrivateRoute allowedRoles={["ADMIN", "CLEANER", "SUPERVISOR"]} />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/history" element={<CleaningHistory />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Rotas ADMIN */}
      <Route element={<PrivateRoute allowedRoles={["ADMIN"]} />}>
        <Route element={<Layout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/workers" element={<Workers />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
        </Route>
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;