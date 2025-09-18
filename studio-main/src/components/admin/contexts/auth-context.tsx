"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  hasPermission: (branchId: number, level: 'view_only' | 'full_access') => boolean;
  getUserBranches: () => Array<{ id: number; name: string; location?: string; permission: 'view_only' | 'full_access' }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage on initial load
    const loadUser = () => {
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error('Failed to load user from storage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const hasPermission = (branchId: number, level: 'view_only' | 'full_access'): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    const permission = user.branch_permissions.find(p => p.branch_id === branchId);
    if (!permission) return false;

    if (level === 'view_only') return true;
    return permission.permission_level === 'full_access';
  };

  const getUserBranches = () => {
    if (!user) return [];
    if (user.role === 'admin') {
      // For admins, we'd need to fetch all branches - simplified here
      return [];
    }

    return user.branch_permissions.map(permission => ({
      id: permission.branch_id,
      name: permission.branch?.name || 'Unknown Branch',
      location: permission.branch?.location,
      permission: permission.permission_level
    }));
  };

  const contextValue: AuthContextType = {
    user,
    setUser: (newUser) => {
      setUser(newUser);
      if (newUser) {
        localStorage.setItem('currentUser', JSON.stringify(newUser));
      } else {
        localStorage.removeItem('currentUser');
      }
    },
    isLoading,
    hasPermission,
    getUserBranches
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}