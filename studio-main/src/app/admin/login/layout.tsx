export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  // This layout is now just a simple structural component.
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <main className="flex flex-1 items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
