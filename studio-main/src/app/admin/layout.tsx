"use client";

import { cn } from "@/lib/utils"; 
import { AuthProvider } from "@/components/admin/contexts/auth-provider";
import { Toaster } from "@/components/ui/toaster";
import { alegreya, belleza } from "@/lib/fonts";
import { usePathname } from 'next/navigation';
import { AdminHeader } from '@/components/admin/admin-header';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showHeader = !(pathname && pathname.startsWith('/admin/login'));
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {showHeader && <AdminHeader />}
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        {children}
      </main>
    </div>
  );
}
