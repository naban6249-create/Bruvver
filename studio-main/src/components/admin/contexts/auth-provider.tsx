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

  // In auth-provider.tsx, replace the login function:
const login = async (email: string, password: string): Promise<User> => {
  try {
    // Call backend API directly, not server action
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: email, // Your backend expects 'username', not 'email'
        password: password
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Login failed:', errorData);
      throw new Error('Login failed');
    }

    const data = await response.json();
    
    // Store token in both localStorage and cookies for compatibility
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
    }
    
    setUser(data.user);
    return data.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

  const logout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with cleanup even if API call fails
    } finally {
      // Always clear local state and storage
      setUser(null);
      
      if (typeof window !== 'undefined') {
        // Clear all authentication data
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('selectedBranchId');
      }
      
      // Navigate to login page
      router.push('/admin/login');
    }
  };

  const forgotPassword = async (usernameOrEmail: string): Promise<{ message: string; success: boolean }> => {
    try {
      // You can implement this later or create a simple placeholder
      return { message: 'Password reset functionality not implemented yet', success: false };
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
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
    forgotPassword,
    hasPermission,
    getUserBranches,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
