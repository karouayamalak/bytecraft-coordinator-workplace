import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, Department } from '../lib/types';
import api, { setAuthToken, clearAuth, setDemoUserId } from '../lib/api';

interface AuthContextValue {
  user: User | null;
  department: Department | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (emailOrCredential: string) => Promise<void>;
  switchDemoUser: (userId: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_USERS: any[] = [];
export { DEMO_USERS };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDepartment = useCallback(async (deptId: string | null) => {
    if (!deptId) { setDepartment(null); return; }
    try {
      const res = await api.get<{ success: boolean; data: any }>(`/departments/${deptId}`);
      const dept = res?.data?.department || res?.data || null;
      setDepartment(dept);
      return dept;
    } catch {
      setDepartment(null);
      return null;
    }
  }, []);

  const initFromStorage = useCallback(async () => {
    const storedToken = localStorage.getItem('bc_token');
    const storedUser = localStorage.getItem('bc_user');
    const storedDept = localStorage.getItem('bc_department');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setAuthToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        if (storedDept) {
          setDepartment(JSON.parse(storedDept));
        } else {
          await fetchDepartment(parsedUser.departmentId);
        }
      } catch {
        localStorage.removeItem('bc_token');
        localStorage.removeItem('bc_user');
        localStorage.removeItem('bc_department');
      }
    }
    setIsLoading(false);
  }, [fetchDepartment]);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  const storeSession = useCallback((newToken: string, newUser: User, newDept: Department | null) => {
    setToken(newToken);
    setUser(newUser);
    setDepartment(newDept);
    setAuthToken(newToken);
    setDemoUserId(null);
    localStorage.setItem('bc_token', newToken);
    localStorage.setItem('bc_user', JSON.stringify(newUser));
    if (newDept) localStorage.setItem('bc_department', JSON.stringify(newDept));
    else localStorage.removeItem('bc_department');
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<{ success: boolean; data: { token: string; user: User } }>(
      '/auth/login',
      { email, password }
    );
    const { token: newToken, user: newUser } = response.data;
    setAuthToken(newToken);
    let dept: Department | null = null;
    if (newUser.departmentId) {
      try {
        const res = await api.get<{ success: boolean; data: any }>(`/departments/${newUser.departmentId}`);
        dept = res?.data?.department || res?.data || null;
      } catch { dept = null; }
    }
    storeSession(newToken, newUser, dept);
  }, [storeSession]);

  const loginWithGoogle = useCallback(async (emailOrCredential: string) => {
    const isJwt = emailOrCredential.includes('.') && emailOrCredential.split('.').length === 3;
    const payload = isJwt
      ? { credential: emailOrCredential }
      : { email: emailOrCredential.trim().toLowerCase() };

    const response = await api.post<{ success: boolean; data: { token: string; user: User } }>(
      '/auth/google',
      payload
    );
    const { token: newToken, user: newUser } = response.data;
    setAuthToken(newToken);
    let dept: Department | null = null;
    if (newUser.departmentId) {
      try {
        const res = await api.get<{ success: boolean; data: any }>(`/departments/${newUser.departmentId}`);
        dept = res?.data?.department || res?.data || null;
      } catch { dept = null; }
    }
    storeSession(newToken, newUser, dept);
  }, [storeSession]);

  const switchDemoUser = useCallback(async (userId: string) => {
    const response = await api.post<{ success: boolean; data: { token: string; user: User } }>(
      '/auth/switch-demo',
      { userId }
    );
    const { token: newToken, user: newUser } = response.data;
    setAuthToken(newToken);
    let dept: Department | null = null;
    if (newUser.departmentId) {
      try {
        const res = await api.get<{ success: boolean; data: any }>(`/departments/${newUser.departmentId}`);
        dept = res?.data?.department || res?.data || null;
      } catch { dept = null; }
    }
    storeSession(newToken, newUser, dept);
  }, [storeSession]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setDepartment(null);
    clearAuth();
    localStorage.removeItem('bc_token');
    localStorage.removeItem('bc_user');
    localStorage.removeItem('bc_department');
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('bc_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, department, token, isLoading, login, loginWithGoogle, switchDemoUser, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
