import { createContext, useContext } from 'react';
import type { User } from './types';

export interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  hasPermission: (branchId: number, level: 'view_only' | 'full_access') => boolean;
  getUserBranches: () => Array<{ 
    id: number; 
    name: string; 
    location?: string; 
    permission: 'view_only' | 'full_access' 
  }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper functions for working with user permissions
export const authUtils = {
  hasPermission: (user: User | null, branchId: number, level: 'view_only' | 'full_access' = 'view_only'): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    const permission = user.branch_permissions.find(p => p.branch_id === branchId);
    if (!permission) return false;

    if (level === 'view_only') return true;
    return permission.permission_level === 'full_access';
  },

  getUserBranches: (user: User | null) => {
    if (!user) return [];
    if (user.role === 'admin') return [];

    return user.branch_permissions.map(permission => ({
      id: permission.branch_id,
      name: permission.branch?.name || 'Unknown Branch',
      location: permission.branch?.location,
      permission: permission.permission_level
    }));
  },

  getCurrentUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const savedUser = localStorage.getItem('currentUser');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error('Failed to load user from storage:', error);
      return null;
    }
  },

  saveUser: (user: User | null): void => {
    if (typeof window === 'undefined') return;

    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
  },

  clearAuth: (): void => {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
  }
};