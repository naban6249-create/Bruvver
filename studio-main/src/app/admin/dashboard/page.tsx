import { Suspense } from 'react';
import { DashboardClient } from "../../../components/admin/dashboard-client";

export const dynamic = 'force-dynamic';
export default function DashboardPage() {
    return (
        <Suspense fallback={<div>Loading dashboard...</div>}>
            <DashboardClient />
        </Suspense>
    );
}
