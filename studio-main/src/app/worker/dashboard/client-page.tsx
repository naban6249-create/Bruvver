"use client";

import { AuthProvider } from '@/components/admin/contexts/auth-provider';
import { AdminHeader } from '@/components/admin/admin-header';
import { WorkerDashboard } from '@/components/admin/dashboard/worker-dashboard';
import { Toaster } from '@/components/ui/toaster';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function WorkerDashboardClientPage() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen w-full flex-col">
        <AdminHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <WorkerDashboard />
        </main>
      </div>
      <Toaster />
    </AuthProvider>
  );
}
