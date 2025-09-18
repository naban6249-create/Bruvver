"use client";

import React, { useState, useEffect } from 'react';
import { AuthContext, authUtils, type AuthContextType } from './auth-context';
import type { User } from './types';

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
        const savedUser = authUtils.getCurrentUser();
        if (savedUser) {
          setUser(savedUser);
        }
      } catch (error) {
        console.error('Failed to load user from storage:', error);
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