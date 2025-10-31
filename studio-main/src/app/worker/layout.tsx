/**
 * This layout is now a simple pass-through component, as all client-side
 * logic has been moved into the WorkerDashboardClientPage.
 */
'use client';
export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
