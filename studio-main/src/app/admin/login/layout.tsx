import { AuthProvider } from "@/components/admin/contexts/auth-provider";

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  // Dedicated layout for /admin/login that does NOT include the AdminHeader
  return (
    <AuthProvider>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <main className="flex flex-1 items-center justify-center p-4">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
