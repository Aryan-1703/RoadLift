import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { AdminUser } from '../types';

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('rl_admin_token'));
  const [user, setUser] = useState<AdminUser | null>(() => {
    const stored = localStorage.getItem('rl_admin_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (newToken: string, newUser: AdminUser) => {
    localStorage.setItem('rl_admin_token', newToken);
    localStorage.setItem('rl_admin_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('rl_admin_token');
    localStorage.removeItem('rl_admin_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token && !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
