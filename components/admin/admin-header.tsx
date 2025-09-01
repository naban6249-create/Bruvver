import Link from 'next/link';
import { Coffee, LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function AdminHeader() {
  return (
    <header className="sticky top-0 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6 z-50">
        <div className="flex items-center gap-2">
            <Coffee className="h-6 w-6" />
            <h1 className="text-lg font-semibold font-headline">Coffee Command Center</h1>
        </div>
        <Button variant="outline" size="sm" asChild>
            <Link href="/">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Link>
        </Button>
    </header>
  );
}
