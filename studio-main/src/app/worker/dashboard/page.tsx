import { Suspense } from 'react';
import { WorkerDashboard } from "@/components/admin/dashboard/worker-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * A loading component to show while the dashboard's client-side
 * components are being rendered.
 */
function DashboardLoadingFallback() {
  return (
    <div className="space-y-6">
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
      <WorkerDashboard />
    </Suspense>
  );
}
