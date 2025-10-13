"use client";

import { AuthProvider } from "../../components/admin/contexts/auth-provider";
import { Toaster } from "../../components/ui/toaster";
import { usePathname } from 'next/navigation';
import { AdminHeader } from '../../components/admin/admin-header';
import { Suspense } from 'react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // The login page and other public pages will not show the header.
  const showHeader = !(pathname && (
    pathname.startsWith('/admin/login') || 
    pathname.startsWith('/admin/reset-password'))
  );

  return (
    // Wrap ALL admin routes in the AuthProvider
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
      <Toaster />
    </AuthProvider>
  );
}
