"use client";

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DailyBalanceDashboard } from "./dashboard/daily-balance-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Mail, Sheet } from 'lucide-react';
import { useAuth } from "../../lib/auth-context"; // Correctly import the hook
import { Button } from "../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { DailySalesBreakdown } from "./dashboard/daily-sales-breakdown";
import { DailyExpenses } from "./expenses/daily-expenses";
import { BranchManagement } from "./branches/branch-management";
import { ReportsDashboard } from "./reports/reports-dashboard";
import { useToast } from "../../hooks/use-toast";
import { MenuManagement } from "./menu/menu-management";
import { WorkerDashboard } from './dashboard/worker-dashboard';
import { PermissionManagement } from './permissions/permission-management';

export function DashboardClient() {
    const { toast } = useToast();
    const { user, hasPermission, isLoading } = useAuth(); // Use isLoading from context
    const router = useRouter();
    const searchParams = useSearchParams();
    const role = searchParams.get('role') || user?.role;
    const branchId = searchParams.get('branchId');

    useEffect(() => {
        // Redirect to login if the auth check is done and there's no user
        if (!isLoading && !user) {
            router.push('/admin/login');
        }
    }, [isLoading, user, router]);

    // Show a loading spinner while the app confirms if the user is logged in
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }
    
    // Don't render anything if there's no user (the useEffect will redirect)
    if (!user) {
        return null; 
    };
    
    if (role === 'worker') {
        return (
            <div className="container mx-auto p-6">
                <Suspense fallback={<div>Loading worker dashboard...</div>}>
                    <WorkerDashboard />
                </Suspense>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto p-6">
            <Tabs defaultValue="dashboard">
                <div className="flex items-center justify-between mb-6">
                    <TabsList>
                        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                        <TabsTrigger value="balance">Daily Balance</TabsTrigger>
                        <TabsTrigger value="menu">Menu</TabsTrigger>
                        <TabsTrigger value="expenses">Daily Expenses</TabsTrigger>
                        <TabsTrigger value="branches">Branches</TabsTrigger>
                        <TabsTrigger value="permissions">User Permissions</TabsTrigger>
                        <TabsTrigger value="reports">Reports</TabsTrigger>
                    </TabsList>
                </div>
                
                <TabsContent value="dashboard">
                    <Suspense fallback={<div>Loading sales data...</div>}>
                        <DailySalesBreakdown />
                    </Suspense>
                    <div className="mt-8 grid gap-4 md:gap-8 lg:grid-cols-2">
                        {/* Data Export & Email Reports Cards can be added here */}
                    </div>
                </TabsContent>
                
                <TabsContent value="balance">
                    <Suspense fallback={<div>Loading balance data...</div>}>
                        <DailyBalanceDashboard />
                    </Suspense>
                </TabsContent>
                
                <TabsContent value="menu">
                    <MenuManagement />
                </TabsContent>
                
                <TabsContent value="expenses">
                    <DailyExpenses />
                </TabsContent>
                
                <TabsContent value="branches">
                    <BranchManagement />
                </TabsContent>
                
                <TabsContent value="permissions">
                    <PermissionManagement />
                </TabsContent>
                
                <TabsContent value="reports">
                    <ReportsDashboard />
                </TabsContent>
            </Tabs>
        </div>
    );
}