"use client";

import React, { useState, useEffect } from 'react';
import { AuthContext, type AuthContextType } from '@/lib/auth-context';
import { loginUser, logoutUser } from '@/lib/auth-service';
import { useRouter } from 'next/navigation';
import type { User, Branch } from '@/lib/types';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUser = () => {
      if (typeof window !== 'undefined') {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
          } catch (error) {
            console.error('Failed to parse user from localStorage', error);
            localStorage.removeItem('currentUser');
          }
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const response = await loginUser(email, password);
      if (response) {
        setUser(response.user);
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        return response.user;
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
      setUser(null);
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const hasPermission = (branchId: number, requiredLevel: 'view_only' | 'full_access'): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    const permission = user.branch_permissions?.find(p => p.branch_id === branchId);
    if (!permission) return false;

    if (requiredLevel === 'full_access') {
      return permission.permission_level === 'full_access';
    }

    return true; // If view_only is required, any permission is sufficient
  };

  const getUserBranches = (): Array<Branch & { permission: 'view_only' | 'full_access' }> => {
    if (!user) return [];

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
      permission: p.permission_level as 'view_only' | 'full_access'
    })) || [];
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    hasPermission,
    getUserBranches,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};