"use client";

import React, { createContext, useContext } from 'react';
import type { User, Branch } from './types';

// 1. DEFINE THE SHAPE OF YOUR CONTEXT DATA
export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  hasPermission: (branchId: number, requiredLevel: 'view_only' | 'full_access') => boolean;
  getUserBranches: () => Array<Branch & { permission: 'view_only' | 'full_access' }>;
  isLoading: boolean;
}

// 2. CREATE THE CONTEXT
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. CREATE A CUSTOM HOOK TO USE THE CONTEXT
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};