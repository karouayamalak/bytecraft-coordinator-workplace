import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { VisibilitySettings } from '../lib/types';
import api from '../lib/api';
import { useAuth } from './AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';

interface VisibilityContextValue {
  visibility: VisibilitySettings;
  isLoading: boolean;
  updateVisibility: (updates: Partial<VisibilitySettings>) => Promise<void>;
  isModuleAllowed: (moduleKey: string) => boolean;
  canViewDepartment: (deptId?: string | null) => boolean;
}

const DEFAULT_VISIBILITY: VisibilitySettings = {
  showAllDepartments: false,
  showRadar: false,
  showWorkload: false,
  showDeadlines: true,
  showReports: false,
  showMeetings: true,
  showBudget: false,
  allowedTabs: ['dashboard', 'tasks', 'departments', 'events', 'meetings', 'deadlines']
};

const VisibilityContext = createContext<VisibilityContextValue | null>(null);

export function VisibilityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [visibility, setVisibility] = useState<VisibilitySettings>(DEFAULT_VISIBILITY);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVisibility = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: { visibility?: VisibilitySettings } }>('/system/settings');
      if (res?.data?.visibility) {
        setVisibility(res.data.visibility);
      }
    } catch (err) {
      console.error('Failed to load visibility settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisibility();
  }, [fetchVisibility]);

  // Real-time updates when Coordinator changes settings
  useWebSocket((msg) => {
    if (msg.type === 'SETTINGS_UPDATED') {
      const payload = msg.payload as { visibility?: VisibilitySettings };
      if (payload?.visibility) {
        setVisibility(payload.visibility);
      }
    }
  });

  const updateVisibility = async (updates: Partial<VisibilitySettings>) => {
    const next = { ...visibility, ...updates };
    setVisibility(next);
    try {
      await api.patch('/system/settings', { visibility: next });
    } catch (err) {
      console.error('Failed to save visibility settings:', err);
      // rollback
      fetchVisibility();
    }
  };

  const isModuleAllowed = useCallback((moduleKey: string): boolean => {
    if (!user) return false;
    // Coordinator has unconditional access to every module
    if (user.role === 'COORDINATOR') return true;

    // Check specific module flags
    if (moduleKey === 'radar' && !visibility.showRadar) return false;
    if (moduleKey === 'workload' && !visibility.showWorkload) return false;
    if (moduleKey === 'deadlines' && !visibility.showDeadlines) return false;
    if (moduleKey === 'reports' && !visibility.showReports) return false;
    if (moduleKey === 'meetings' && !visibility.showMeetings) return false;

    // Check allowed tabs array
    if (visibility.allowedTabs && !visibility.allowedTabs.includes(moduleKey)) {
      return false;
    }

    return true;
  }, [user, visibility]);

  const canViewDepartment = useCallback((deptId?: string | null): boolean => {
    if (!user) return false;
    if (user.role === 'COORDINATOR') return true;
    if (visibility.showAllDepartments) return true;
    if (!deptId) return true;
    return user.departmentId === deptId;
  }, [user, visibility]);

  return (
    <VisibilityContext.Provider value={{
      visibility,
      isLoading,
      updateVisibility,
      isModuleAllowed,
      canViewDepartment
    }}>
      {children}
    </VisibilityContext.Provider>
  );
}

export function useVisibility() {
  const ctx = useContext(VisibilityContext);
  if (!ctx) {
    throw new Error('useVisibility must be used within a VisibilityProvider');
  }
  return ctx;
}
