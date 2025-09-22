// lib/auth-context.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Branch } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  hasPermission: (branchId: number, requiredLevel: 'view_only' | 'full_access') => boolean;
  getUserBranches: () => Array<Branch & { permission: string }>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  hasPermission: () => false,
  getUserBranches: () => [],
  isLoading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage on mount
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
        } catch (error) {
          console.error('Error parsing saved user:', error);
          localStorage.removeItem('currentUser');
        }
      }
    }
    setIsLoading(false);
  }, []);

  const hasPermission = (branchId: number, requiredLevel: 'view_only' | 'full_access'): boolean => {
    if (!user) return false;
    
    // Admins have full access to all branches
    if (user.role === 'admin') return true;
    
    // Workers need explicit permissions
    const permission = user.branch_permissions?.find(p => p.branch_id === branchId);
    if (!permission) return false;
    
    // If full access is required, check specifically for that
    if (requiredLevel === 'full_access') {
      return permission.permission_level === 'full_access';
    }
    
    // For view_only requirement, both view_only and full_access are sufficient
    return permission.permission_level === 'view_only' || permission.permission_level === 'full_access';
  };

  const getUserBranches = (): Array<Branch & { permission: string }> => {
    if (!user) return [];
    
    // Admins can access all branches - but we need to fetch them from API
    // For now, return branches from permissions
    return user.branch_permissions?.map(p => ({
      id: p.branch_id,
      name: p.branch?.name || `Branch ${p.branch_id}`,
      location: p.branch?.location || '',
      address: p.branch?.address || '',
      phone: p.branch?.phone || '',
      email: p.branch?.email || '',
      is_active: p.branch?.is_active || true,
      created_at: p.branch?.created_at || new Date().toISOString(),
      updated_at: p.branch?.updated_at || new Date().toISOString(),
      permission: p.permission_level
    })) || [];
  };

  const contextValue: AuthContextType = {
    user,
    setUser: (newUser) => {
      setUser(newUser);
      if (typeof window !== 'undefined') {
        if (newUser) {
          localStorage.setItem('currentUser', JSON.stringify(newUser));
        } else {
          localStorage.removeItem('currentUser');
          localStorage.removeItem('token');
        }
      }
    },
    hasPermission,
    getUserBranches,
    isLoading,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}