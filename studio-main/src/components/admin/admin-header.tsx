"use client";

import Link from 'next/link';
import { LogOut, Menu, X, Building2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Branch, User } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { getBranches } from '@/lib/branch-service';

interface AdminHeaderProps {
  currentUser?: User;
}

export function AdminHeader({ currentUser }: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const effectiveUser = currentUser ?? user ?? null;
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);
  const [currentPermission, setCurrentPermission] = useState<'view_only' | 'full_access' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBranchPopoverOpen, setIsBranchPopoverOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Load available branches on component mount or when the user changes
  useEffect(() => {
    const loadBranches = async () => {
      if (!effectiveUser) return;

      try {
        let branches: Branch[] = [];
        if (effectiveUser.role === 'admin') {
          branches = await getBranches();
        } else if (effectiveUser.role === 'worker' && effectiveUser.branch_permissions) {
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

    if (currentBranchId && findBranch(currentBranchId)) {
      setSelectedBranch(currentBranchId);
    } else {
      const savedBranchId = typeof window !== 'undefined' ? localStorage.getItem('selectedBranchId') : null;
      if (savedBranchId && findBranch(savedBranchId)) {
        setSelectedBranch(savedBranchId);
      } else {
        setSelectedBranch(availableBranches[0].id.toString());
      }
    }
  }, [availableBranches, effectiveUser, searchParams]);

  // Effect to synchronize the selected branch with the URL and update permissions
  useEffect(() => {
    if (!selectedBranch || !effectiveUser) return;

    const currentUrlBranchId = searchParams.get('branchId');
    if (selectedBranch !== currentUrlBranchId) {
      const newUrl = new URLSearchParams(searchParams.toString());
      newUrl.set('branchId', selectedBranch);
      router.replace(`?${newUrl.toString()}`);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedBranchId', selectedBranch);
    }
    
    if (effectiveUser.role === 'worker' && effectiveUser.branch_permissions) {
      const permission = effectiveUser.branch_permissions.find(
        p => p.branch_id.toString() === selectedBranch
      );
      setCurrentPermission(permission?.permission_level || null);
    } else if (effectiveUser.role === 'admin') {
      setCurrentPermission('full_access');
    }
  }, [selectedBranch, effectiveUser, router, searchParams]);

  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId);
    setIsBranchPopoverOpen(false);
    setIsMobileMenuOpen(false);
  };

  // ✅ FIXED: Proper logout handler with cleanup
  const handleLogout = async () => {
    try {
      await logout();
      // Close mobile menu if open
      setIsMobileMenuOpen(false);
      // Redirect will be handled by logout() in auth-context
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getSelectedBranchName = () => {
    const branch = availableBranches.find(b => b.id.toString() === selectedBranch);
    return branch ? branch.name : 'Select Branch';
  };

  const renderBranchSelector = (isMobile = false) => {
    if (!effectiveUser || availableBranches.length === 0) {
      return (
        <div className={`flex items-center gap-2 ${isMobile ? 'py-2' : ''}`}>
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            No branch access assigned
          </span>
        </div>
      );
    }

    if (availableBranches.length === 1) {
      const branch = availableBranches[0];
      return (
        <div className={`flex items-center gap-2 ${isMobile ? 'py-2' : ''}`}>
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col">
            <div className="text-sm font-medium">{branch.name}</div>
            <div className="text-xs text-muted-foreground">
              {currentPermission === 'full_access' ? 'Full Access' : 'View Only'}
            </div>
          </div>
        </div>
      );
    }

    if (isMobile) {
      // Mobile version - use a simple list
      return (
        <div className="space-y-2 py-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="h-4 w-4" />
            Select Branch:
          </div>
          <div className="space-y-1 pl-6">
            {availableBranches.map(branch => (
              <button
                key={branch.id}
                onClick={() => handleBranchChange(branch.id.toString())}
                className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedBranch === branch.id.toString()
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="font-medium">{branch.name}</div>
                <div className="text-xs opacity-75">{branch.location}</div>
              </button>
            ))}
          </div>
          {currentPermission && (
            <div className="text-xs text-muted-foreground pl-6">
              Access: {currentPermission === 'full_access' ? 'Full Access' : 'View Only'}
            </div>
          )}
        </div>
      );
    }

    // Desktop version - use Popover for better UX
    return (
      <Popover open={isBranchPopoverOpen} onOpenChange={setIsBranchPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="justify-between min-w-[160px] max-w-[200px]"
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{getSelectedBranchName()}</span>
            </div>
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="space-y-1">
            {availableBranches.map(branch => (
              <button
                key={branch.id}
                onClick={() => handleBranchChange(branch.id.toString())}
                className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedBranch === branch.id.toString()
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="font-medium">{branch.name}</div>
                <div className="text-xs opacity-75">{branch.location}</div>
              </button>
            ))}
          </div>
          {currentPermission && (
            <div className="border-t mt-2 pt-2 text-xs text-muted-foreground px-3">
              Access Level: {currentPermission === 'full_access' ? 'Full Access' : 'View Only'}
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  const UserInfo = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`flex items-center gap-2 ${isMobile ? 'py-2' : ''}`}>
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {effectiveUser?.username || currentUser?.username || 'User'}
        </span>
        <span className="text-xs text-muted-foreground">
          {effectiveUser?.role === 'admin' ? 'Administrator' : 'Worker'}
        </span>
      </div>
    </div>
  );

  return (
    <header className="sticky top-0 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6 z-50">
      {/* Left section - Logo and Branch Selector */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Logo */}
        <Link href="/admin/dashboard" className="flex items-center gap-2 flex-shrink-0">
          <img
            src="/images/bruvvers_logo_main.png"
            alt="Bruvvver Coffee Logo"
            className="h-6 w-auto"
          />
        </Link>
        
        {/* Desktop Branch Selector */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Branch:</span>
          {renderBranchSelector()}
        </div>
      </div>

      {/* Right section - User info and actions */}
      <div className="flex items-center gap-2">
        {/* Desktop User Info and Actions */}
        <div className="hidden md:flex items-center gap-3">
          <UserInfo />
          {/* Home/Landing Page Link */}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              Home
            </Link>
          </Button>
          {/* ✅ FIXED: Use onClick with handleLogout instead of Link */}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[350px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <img
                  src="/images/bruvvers_logo_main.png"
                  alt="Bruvvver Coffee Logo"
                  className="h-6 w-auto"
                />
                <span>Bruvvers Coffee</span>
              </SheetTitle>
            </SheetHeader>
            
            <div className="mt-6 space-y-6">
              {/* User Info */}
              <div className="pb-4 border-b">
                <UserInfo isMobile />
              </div>

              {/* Branch Selector */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Branch Selection
                </h3>
                {renderBranchSelector(true)}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t">
                {/* Home/Landing Page Link */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start" 
                  asChild
                >
                  <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                    Home
                  </Link>
                </Button>
                {/* ✅ FIXED: Use onClick with handleLogout for mobile too */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start" 
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
