"use client";

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Branch, User, UserBranchPermission } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
 
interface AdminHeaderProps {
  currentUser?: User;
}

export function AdminHeader({ currentUser }: AdminHeaderProps) {
  const { user } = useAuth();
  const effectiveUser = currentUser ?? user ?? null;
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);
  const [currentPermission, setCurrentPermission] = useState<'view_only' | 'full_access' | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string | null>(null);
  

  // Track token in localStorage and react to changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const loadToken = () => setAuthToken(localStorage.getItem('token'));
    loadToken();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token') loadToken();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Load branches for admin users from API using client token
  useEffect(() => {
    const role = effectiveUser?.role;
    if (role === 'admin') {
      const token = typeof window !== 'undefined' ? (authToken ?? localStorage.getItem('token')) : null;
      if (!token) return;
      fetch('/api/branches', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(await res.text());
          return res.json();
        })
        .then((branches: Branch[]) => {
          setAvailableBranches(branches || []);
        })
        .catch(() => {
          setAvailableBranches([]);
        });
    }
  }, [effectiveUser?.role, authToken]);

  useEffect(() => {
    if (effectiveUser) {
      // For workers, extract branches from user permissions
      if (effectiveUser.role === 'worker') {
        const branches = effectiveUser.branch_permissions
          .filter(permission => permission.branch)
          .map(permission => permission.branch!);
        // Avoid infinite loops: only update if the list actually changed
        const same =
          branches.length === availableBranches.length &&
          branches.every((b, i) => b.id === availableBranches[i]?.id);
        if (!same) {
          setAvailableBranches(branches);
        }
      }
      
      // Set initial branch selection
      const currentBranchId = searchParams.get('branchId');
      if (currentBranchId && availableBranches.find(b => b.id.toString() === currentBranchId)) {
        setSelectedBranch(currentBranchId);
        
        // Set current permission level
        const permission = effectiveUser.branch_permissions.find(
          p => p.branch_id.toString() === currentBranchId
        );
        setCurrentPermission(permission?.permission_level || null);
      } else if (availableBranches.length > 0) {
        // Try to use persisted branch from localStorage (only on client)
        const savedBranchId = typeof window !== 'undefined' ? localStorage.getItem('selectedBranchId') : null;
        const savedValid = savedBranchId && availableBranches.find(b => b.id.toString() === savedBranchId);

        const initialBranchId = savedValid ? savedBranchId! : availableBranches[0].id.toString();

        // Auto-select first available branch (only if different)
        const current = searchParams.get('branchId');
        if (current !== initialBranchId) {
          const newUrl = new URLSearchParams(searchParams.toString());
          newUrl.set('branchId', initialBranchId);
          router.replace(`?${newUrl.toString()}`);
        }
        setSelectedBranch(initialBranchId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedBranchId', initialBranchId);
        }
        
        const permission = effectiveUser.branch_permissions.find(
          p => p.branch_id.toString() === initialBranchId
        );
        setCurrentPermission(permission?.permission_level || null);
      }
    }
  }, [effectiveUser, searchParams, router, availableBranches]);

  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId);
    
    // Update URL with selected branch
    const newUrl = new URLSearchParams(searchParams.toString());
    newUrl.set('branchId', branchId);
    router.replace(`?${newUrl.toString()}`);
    // Persist selection for future routes
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedBranchId', branchId);
    }
    
    // Update permission level
    const permission = effectiveUser?.branch_permissions.find(
      p => p.branch_id.toString() === branchId
    );
    setCurrentPermission(permission?.permission_level || null);
  };

  const renderBranchSelector = () => {
    if (!effectiveUser) {
      return null;
    }

    if (availableBranches.length === 0) {
      return (
        <div className="text-sm text-muted-foreground">
          No branch access assigned
        </div>
      );
    }

    if (availableBranches.length === 1) {
      // Single branch - show as static text
      const branch = availableBranches[0];
      return (
        <div className="flex flex-col">
          <div className="text-sm font-medium">{branch.name}</div>
          <div className="text-xs text-muted-foreground">
            {currentPermission === 'full_access' ? 'Full Access' : 'View Only'}
          </div>
        </div>
      );
    }

    // Multiple branches - show dropdown
    return (
      <div className="flex flex-col gap-1">
        <Select value={selectedBranch} onValueChange={handleBranchChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Branch" />
          </SelectTrigger>
          <SelectContent>
            {availableBranches.map(branch => (
              <SelectItem key={branch.id} value={branch.id.toString()}>
                {branch.name} ({branch.location})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentPermission && (
          <div className="text-xs text-muted-foreground">
            {currentPermission === 'full_access' ? 'Full Access' : 'View Only'}
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="sticky top-0 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6 z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold font-headline">
            <img
              src="/images/bruvvers_logo_main.png"
              alt="Bruvvver Coffee Logo"
              className="h-6 w-auto"
            />
          </h1>
        </div>
        
        {/* Branch Selector */}
        <div className="flex items-center gap-2 ml-8">
          <span className="text-sm text-muted-foreground">Branch:</span>
          {renderBranchSelector()}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Welcome, {effectiveUser?.username || currentUser?.username}
        </span>
        
        <Button variant="outline" size="sm" asChild>
          <Link href="/">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Link>
        </Button>
      </div>
    </header>
  );
}