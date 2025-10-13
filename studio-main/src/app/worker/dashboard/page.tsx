import { Suspense } from 'react';
import WorkerDashboardClientPage from './client-page'; // Import the new client component
import { Skeleton } from "@/components/ui/skeleton";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * A loading component to show while the dashboard's client-side
 * components are being rendered.
 */
function DashboardLoadingFallback() {
  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Skeleton for Header */}
      <Skeleton className="h-16 w-full" />
      {/* Skeleton for Dashboard Content */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-[120px] w-full" />
        <Skeleton className="h-[120px] w-full" />
        <Skeleton className="h-[120px] w-full" />
        <Skeleton className="h-[120px] w-full" />
      </div>
      <div className="grid gap-4">
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  );
}

export default function WorkerDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingFallback />}>
      <WorkerDashboardClientPage />
    </Suspense>
  );
}
