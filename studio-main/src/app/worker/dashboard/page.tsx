// src/app/worker/dashboard/page.tsx

// FIX: Use curly braces { } for a named import
import { WorkerDashboard } from '@/app/worker/dashboard/worker_dashboard';

// We can use the Admin layout, as it provides the sidebar and header
import AdminLayout from '@/app/admin/layout'; 

export default function WorkerDashboardPage() {
  return (
    <AdminLayout>
      <WorkerDashboard />
    </AdminLayout>
  );
}