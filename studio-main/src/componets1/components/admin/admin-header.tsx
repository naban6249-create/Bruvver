"use client";

import Link from 'next/link';
import { Coffee, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BRANCHES_DATA } from '@/lib/data';
import type { Branch } from '@/lib/types';

export function AdminHeader() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const role = searchParams.get('role');
  const branchId = searchParams.get('branchId');

  useEffect(() => {
    // In a real app, you might fetch branches based on user permissions
    setBranches(BRANCHES_DATA);
    // Set default branch if none is selected for admin
    if (role === 'admin' && !branchId && BRANCHES_DATA.length > 0) {
      handleBranchChange(BRANCHES_DATA[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, branchId]);

  const handleBranchChange = (newBranchId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('branchId', newBranchId);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6 z-50">
      <div className="flex items-center gap-2">
        <Coffee className="h-6 w-6" />
        <h1 className="text-lg font-semibold font-headline">Coffee Command Center</h1>
      </div>
      <div className="flex items-center gap-4">
        {role === 'admin' && branches.length > 0 && (
          <Select onValueChange={handleBranchChange} value={branchId || ''}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map(branch => (
                <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
