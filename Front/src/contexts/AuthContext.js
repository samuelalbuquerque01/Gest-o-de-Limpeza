import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(authService.getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const boot = async () => {
      try {
        setLoading(true);
        const result = await authService.checkAuth();

        if (result?.isAuthenticated) {
          setUser(result.user);
        } else {
          setUser(null);
          // compatibilidade
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('auth');
        }
      } catch (e) {
        console.error('Erro ao verificar autenticação:', e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const result = await authService.login(email, password);

      if (result.success) {
        setUser(result.user);
        return { success: true, user: result.user };
      }

      setError(result.message);
      return { success: false, error: result.message };
    } catch (e) {
      const message = e?.message || 'Erro ao conectar com o servidor';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const loginWorker = async (identifier, password) => {
    try {
      setLoading(true);
      setError(null);

      const result = await authService.loginWorker(identifier, password);

      if (result.success) {
        const u = authService.getCurrentUser();
        setUser(u);
        return { success: true, user: u };
      }

      setError(result.message);
      return { success: false, error: result.message };
    } catch (e) {
      const message = e?.message || 'Erro ao conectar com o servidor';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error('Erro ao fazer logout:', e);
    } finally {
      setUser(null);
      setError(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const result = await authService.getProfile();
      if (result?.success && result?.user) {
        setUser(result.user);
        return result.user;
      }
    } catch (e) {
      console.error('Erro ao atualizar perfil:', e);
    }
    return null;
  };

  const hasRole = (role) => {
    if (!user) return false;
    if (Array.isArray(role)) return role.includes(user.role);
    return user.role === role;
  };

  const value = {
    user,
    loading,
    error,
    login,
    loginWorker,
    logout,
    refreshProfile,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    isCleaner: user?.role === 'CLEANER',
    isSupervisor: user?.role === 'SUPERVISOR',
    hasRole,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
