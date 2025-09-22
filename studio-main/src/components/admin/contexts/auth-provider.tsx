"use client";

import React, { useState, useEffect } from 'react';
import { AuthContext, type AuthContextType, authUtils } from '@/lib/auth-context';
import { getCurrentUser } from '@/lib/auth-service';
import type { User } from '@/lib/types';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Try localStorage first
        const savedUser = authUtils.getCurrentUser();
        if (savedUser) {
          setUser(savedUser);
          setIsLoading(false);
          return;
        }

        // Try API call as fallback
        const userData = await getCurrentUser();
        if (userData) {
          setUser(userData);
          authUtils.saveUser(userData);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        // User is not logged in, which is fine.
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    authUtils.saveUser(newUser);
  };

  const hasPermission = (branchId: number, level: 'view_only' | 'full_access' = 'view_only'): boolean => {
    return authUtils.hasPermission(user, branchId, level);
  };

  const getUserBranches = () => {
    return authUtils.getUserBranches(user);
  };

  const contextValue: AuthContextType = {
    user,
    setUser: handleSetUser,
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