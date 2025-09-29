import { AuthProvider } from '@/components/admin/contexts/auth-provider';
import { AdminHeader } from '@/components/admin/admin-header';
import { Toaster } from '@/components/ui/toaster';

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen w-full flex-col">
        <AdminHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          {children}
        </main>
      </div>
      <Toaster />
    </AuthProvider>
  );
}
