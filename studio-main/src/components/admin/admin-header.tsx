"use client";

import Link from 'next/link';
import { Coffee, LogOut, ChevronDown } from 'lucide-react';
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
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);
  const [currentPermission, setCurrentPermission] = useState<'view_only' | 'full_access' | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (currentUser) {
      // Extract branches from user permissions
      const branches = currentUser.branch_permissions
        .filter(permission => permission.branch)
        .map(permission => permission.branch!);
      
      setAvailableBranches(branches);
      
      // Set initial branch selection
      const currentBranchId = searchParams.get('branchId');
      if (currentBranchId && branches.find(b => b.id.toString() === currentBranchId)) {
        setSelectedBranch(currentBranchId);
        
        // Set current permission level
        const permission = currentUser.branch_permissions.find(
          p => p.branch_id.toString() === currentBranchId
        );
        setCurrentPermission(permission?.permission_level || null);
      } else if (branches.length > 0) {
        // Auto-select first available branch
        const firstBranch = branches[0];
        const newUrl = new URLSearchParams(searchParams.toString());
        newUrl.set('branchId', firstBranch.id.toString());
        router.replace(`?${newUrl.toString()}`);
        setSelectedBranch(firstBranch.id.toString());
        
        const permission = currentUser.branch_permissions.find(
          p => p.branch_id === firstBranch.id
        );
        setCurrentPermission(permission?.permission_level || null);
      }
    }
  }, [currentUser, searchParams, router]);

  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId);
    
    // Update URL with selected branch
    const newUrl = new URLSearchParams(searchParams.toString());
    newUrl.set('branchId', branchId);
    router.replace(`?${newUrl.toString()}`);
    
    // Update permission level
    const permission = currentUser?.branch_permissions.find(
      p => p.branch_id.toString() === branchId
    );
    setCurrentPermission(permission?.permission_level || null);
  };

  const renderBranchSelector = () => {
    if (!currentUser || currentUser.role === 'admin') {
      return (
        <div className="text-sm text-muted-foreground">
          Admin - All Branches
        </div>
      );
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
          <Coffee className="h-6 w-6" />
          <h1 className="text-lg font-semibold font-headline">Coffee Command Center</h1>
        </div>
        
        {/* Branch Selector */}
        <div className="flex items-center gap-2 ml-8">
          <span className="text-sm text-muted-foreground">Branch:</span>
          {renderBranchSelector()}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Welcome, {currentUser?.full_name}
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