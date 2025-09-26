"use client";

import { cn } from "../../lib/utils";
import { AuthProvider } from "../../components/admin/contexts/auth-provider";
import { Toaster } from "../../components/ui/toaster";
import { alegreya, belleza } from "../../lib/fonts";
import { usePathname } from 'next/navigation';
import { AdminHeader } from '../../components/admin/admin-header';
import { Suspense } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showHeader = !(pathname && pathname.startsWith('/admin/login'));

  return (
    <AuthProvider>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        {showHeader && (
          <Suspense fallback={<div className="h-16 border-b bg-background">Loading...</div>}>
            <AdminHeader />
          </Suspense>
        )}
        <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
