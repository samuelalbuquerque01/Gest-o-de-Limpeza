// src/components/common/PrivateRoute.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function PrivateRoute({ allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) return <div style={{ padding: 24 }}>Carregando...</div>;

  if (!isAuthenticated) {
    const isAdminArea = location.pathname.startsWith("/admin");
    return <Navigate to={isAdminArea ? "/admin/login" : "/worker/login"} replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
