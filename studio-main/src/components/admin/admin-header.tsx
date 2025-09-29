"use client";

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Branch, User } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { getBranches } from '@/lib/branch-service'; // Correctly import the service

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

  // Load available branches on component mount or when the user changes
  useEffect(() => {
    const loadBranches = async () => {
      if (!effectiveUser) return;

      try {
        let branches: Branch[] = [];
        if (effectiveUser.role === 'admin') {
          // Admins can see all branches
          branches = await getBranches();
        } else if (effectiveUser.role === 'worker' && effectiveUser.branch_permissions) {
          // Workers see branches from their permissions
          branches = effectiveUser.branch_permissions
            .filter(permission => permission.branch)
            .map(permission => permission.branch!);
        }
        setAvailableBranches(branches || []);
      } catch (error) {
        console.error("Failed to load branches:", error);
        setAvailableBranches([]);
      }
    };

    loadBranches();
  }, [effectiveUser]);

  // Effect to set the initially selected branch from URL or localStorage
  useEffect(() => {
    if (availableBranches.length === 0 || !effectiveUser) return;

    const currentBranchId = searchParams.get('branchId');
    const findBranch = (id: string | null) => id ? availableBranches.find(b => b.id.toString() === id) : undefined;

    // 1. Prioritize URL parameter
    if (currentBranchId && findBranch(currentBranchId)) {
      setSelectedBranch(currentBranchId);
    } 
    // 2. Fallback to localStorage
    else {
      const savedBranchId = typeof window !== 'undefined' ? localStorage.getItem('selectedBranchId') : null;
      if (savedBranchId && findBranch(savedBranchId)) {
        setSelectedBranch(savedBranchId);
      }
      // 3. Default to the first available branch
      else {
        setSelectedBranch(availableBranches[0].id.toString());
      }
    }
  }, [availableBranches, effectiveUser, searchParams]);

  // Effect to synchronize the selected branch with the URL and update permissions
  useEffect(() => {
    if (!selectedBranch || !effectiveUser) return;

    // Update URL if it's out of sync
    const currentUrlBranchId = searchParams.get('branchId');
    if (selectedBranch !== currentUrlBranchId) {
      const newUrl = new URLSearchParams(searchParams.toString());
      newUrl.set('branchId', selectedBranch);
      router.replace(`?${newUrl.toString()}`);
    }

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedBranchId', selectedBranch);
    }
    
    // Update the current permission level based on the selected branch
    if (effectiveUser.role === 'worker' && effectiveUser.branch_permissions) {
      const permission = effectiveUser.branch_permissions.find(
        p => p.branch_id.toString() === selectedBranch
      );
      setCurrentPermission(permission?.permission_level || null);
    } else if (effectiveUser.role === 'admin') {
      // Admins always have full access
      setCurrentPermission('full_access');
    }

  }, [selectedBranch, effectiveUser, router, searchParams]);

  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId);
  };

  const renderBranchSelector = () => {
    if (!effectiveUser || availableBranches.length === 0) {
      return (
        <div className="text-sm text-muted-foreground">
          No branch access assigned
        </div>
      );
    }

    if (availableBranches.length === 1) {
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
